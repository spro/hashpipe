#!/usr/bin/env node

import * as readline from "readline"
import readline_vim from "readline-vim"
import { Pipeline, Scope } from "./pipeline"
import * as builtins from "./builtins"
import ansi from "ansi"
import { prettyPrint } from "./helpers"
import * as fs from "fs"
import * as fsp from "fs/promises"
import * as path from "path"
import minimist from "minimist"
import { formatDate } from "./utils/date-format"

const argv = minimist(process.argv)
const ansiCursor = ansi(process.stdout)

// Helper functions

function getHomeDir(): string {
    return (
        process.env.HOME ||
        process.env.HOMEPATH ||
        process.env.USERPROFILE ||
        ""
    )
}

process.on("SIGTERM", () => {
    console.log("sigterm")
    process.exit()
})
process.on("SIGINT", () => {
    console.log("sigint")
    process.exit()
})

// Import default modules

class PipelineREPL {
    pipeline: Pipeline
    context: Scope
    last_out: any
    plain?: boolean
    run_once?: boolean
    rl?: readline.Interface

    constructor(pipeline?: Pipeline) {
        if (!pipeline) {
            this.pipeline = defaultPipeline()
        } else {
            this.pipeline = pipeline
        }

        // Keep a consistent context for the REPL
        this.context = this.pipeline.subScope()

        // Add command line arguments as variables
        const { _, ...baseEnv } = argv as Record<string, any>
        for (const [key, value] of Object.entries(baseEnv)) {
            this.context.set("vars", key, value)
        }

        // Keep track of last response
        this.last_out = null
    }

    writeSuccess(data: any): void {
        if (data != null) {
            if (this.plain) {
                console.log(data)
            } else {
                console.log(prettyPrint(data))
            }
        }
    }

    writeError(err: any): void {
        ansiCursor.fg.red()
        console.log("[ERROR] " + err)
        ansiCursor.reset()
    }

    async executeScript(script: string): Promise<void> {
        const spinner = startSpinner()
        try {
            const data = await this.pipeline.exec(
                script,
                this.last_out,
                this.context,
            )
            this.last_out = data
            // TODO: Some more advanced output handling,
            // trim long lists with some ellipses
            this.writeSuccess(data)
        } catch (e) {
            this.writeError(e)
        } finally {
            spinner.stop()
        }
    }

    startReadline(): void {
        const repl = this

        // Set up readline prompt
        const fn_names = Object.keys(repl.pipeline.fns || {}).concat(
            Object.keys(builtins),
        )
        const fnCompleter = (line: string): [string[], string] => {
            const line_parts = line.trim().split(/\s+/)
            const to_complete_orig = line_parts.slice(-1)[0]
            let to_complete = to_complete_orig
            const startsWith = (sofar: string) => (s: string) =>
                s.toLowerCase().indexOf(sofar.toLowerCase()) === 0
            const file_commands = [
                "ls",
                "cp",
                "mv",
                "ln",
                "cd",
                "cat",
                "vim",
                "coffee",
                "python",
                "git",
                "open",
            ]
            let completions: string[]

            if (to_complete.match("/")) {
                const base_dir = to_complete.split("/").slice(0, -1).join("/")
                const last_part = to_complete.split("/").slice(-1)[0]
                to_complete = last_part
                completions = fs
                    .readdirSync(base_dir)
                    .filter(startsWith(last_part))
            } else {
                completions = fs
                    .readdirSync(".")
                    .filter(startsWith(to_complete))
            }

            if (!file_commands.includes(line_parts[0])) {
                completions = completions.concat(
                    fn_names.filter(startsWith(to_complete)),
                )
            }

            return [completions, to_complete]
        }

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            completer: fnCompleter,
        })
        const rlv = readline_vim(rl)
        this.rl = rl
        ;(this.context as any)._readline = rl

        // Overload readline's addHistory to save to our history file
        const rl_addHistory = (rl as any)._addHistory
        ;(rl as any)._addHistory = function () {
            const last = (rl as any).history[0]
            const line = rl_addHistory.call(rl)
            if (last !== line) saveHistory(line)
            return line
        }

        // Bootstrap history from file
        loadHistory().then((saved_history) => {
            ;(rl as any).history.push.apply((rl as any).history, saved_history)
        })

        const runScript = async (script: string) => {
            await repl.executeScript(script)
            if (run_once) {
                const script_exec = argv.exec || argv.e
                if (script_exec) {
                    await repl.executeScript(script_exec)
                }
                process.exit()
            } else {
                this.updatePrompt()
                rl.prompt()
            }
        }

        this.updatePrompt()
        rl.prompt()

        // Interpret input as scripts and run
        const run_once = this.run_once || !process.stdin.isTTY
        rl.on("line", (script: string) => {
            script = script.trim()
            if (!script.length) script = "id"
            runScript(script).catch((err) => {
                this.writeError(err)
                this.updatePrompt()
                rl.prompt()
            })
        })

        rl.on("close", () => {
            console.log("bye")
            process.exit()
        })
    }

    updatePrompt(): void {
        const time = "[" + formatDate(new Date(), "HH:mm") + "]"
        const cwd = process.cwd().replace(process.env.HOME || "", "~")
        const parts = [
            colorize(time, 90),
            colorize(cwd, 34),
            colorize("#| ", 36),
        ].join(" ")
        this.rl!.setPrompt(parts)
    }
}

function defaultPipeline(): Pipeline {
    return new Pipeline().use("http").use("html").use("files").use("keywords")
}

// Prompt helpers

function colorize(s: string, color: number): string {
    const prefix = "\x1b[" + color + "m"
    const suffix = "\x1b[0m"
    return prefix + s + suffix
}

// Loading spinner for slow commands. TTY-only so piped/scripted output
// stays clean, and debounced so fast commands never flash it.

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

function startSpinner(): { stop: () => void } {
    if (!process.stdout.isTTY) return { stop: () => {} }
    let frame = 0
    let visible = false
    let interval: ReturnType<typeof setInterval> | undefined
    const draw = () => {
        process.stdout.write("\r" + colorize(SPINNER_FRAMES[frame], 36))
        visible = true
        frame = (frame + 1) % SPINNER_FRAMES.length
    }
    const delay = setTimeout(() => {
        draw()
        interval = setInterval(draw, 80)
    }, 100)
    return {
        stop: () => {
            clearTimeout(delay)
            if (interval) clearInterval(interval)
            if (visible) process.stdout.write("\r\x1b[K")
        },
    }
}

// History helpers

const history_path = path.resolve(getHomeDir(), ".pipeline_history")

function saveHistory(line: string): void {
    fs.appendFileSync(history_path, line + "\n")
}

async function loadHistory(): Promise<string[]> {
    try {
        const history_data = await fsp.readFile(history_path)
        const content = history_data.toString().trim()
        if (!content) return []
        return content.split("\n").reverse()
    } catch {
        return []
    }
}

// Going

if (require.main !== module) {
    // Module mode
    module.exports = PipelineREPL
} else {
    // Stand-alone mode
    const repl = new PipelineREPL()

    if (argv.plain || argv.p) {
        repl.plain = true
    }

    const script_run_filename = argv.run || argv.r
    if (script_run_filename) {
        const doRunScript = () => {
            // Execute single script
            const script = fs.readFileSync(script_run_filename).toString()
            setTimeout(async () => {
                try {
                    await repl.executeScript(script)
                } finally {
                    process.exit()
                }
            }, 50)
        }

        if (!process.stdin.isTTY) {
            // Try reading in piped
            let piped = ""
            process.stdin.on("data", (data) => {
                piped += data.toString()
            })
            process.stdin.on("end", () => {
                repl.last_out = piped.trim()
                doRunScript()
            })
        } else {
            doRunScript()
        }
    } else if (argv.load || argv.l) {
        const script_load_filename = argv.load || argv.l
        // Execute single script
        console.log(`Reading from ${script_load_filename}...`)
        const script = fs.readFileSync(script_load_filename).toString()
        setTimeout(async () => {
            try {
                await repl.executeScript(script)
            } finally {
                repl.startReadline()
            }
        }, 50)
    } else {
        repl.startReadline()
    }
}
