#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline = __importStar(require("readline"));
const readline_vim_1 = __importDefault(require("readline-vim"));
const pipeline_1 = require("./pipeline");
const builtins = __importStar(require("./builtins"));
const ansi_1 = __importDefault(require("ansi"));
const helpers_1 = require("./helpers");
const fs = __importStar(require("fs"));
const fsp = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const minimist_1 = __importDefault(require("minimist"));
const date_format_1 = require("./utils/date-format");
const argv = (0, minimist_1.default)(process.argv);
const ansiCursor = (0, ansi_1.default)(process.stdout);
// Helper functions
function getHomeDir() {
    return (process.env.HOME ||
        process.env.HOMEPATH ||
        process.env.USERPROFILE ||
        "");
}
process.on("SIGTERM", () => {
    console.log("sigterm");
    process.exit();
});
process.on("SIGINT", () => {
    console.log("sigint");
    process.exit();
});
// Import default modules
class PipelineREPL {
    constructor(pipeline) {
        if (!pipeline) {
            this.pipeline = defaultPipeline();
        }
        else {
            this.pipeline = pipeline;
        }
        // Keep a consistent context for the REPL
        this.context = this.pipeline.subScope();
        // Add command line arguments as variables
        const { _, ...baseEnv } = argv;
        for (const [key, value] of Object.entries(baseEnv)) {
            this.context.set("vars", key, value);
        }
        // Keep track of last response
        this.last_out = null;
    }
    writeSuccess(data) {
        if (data != null) {
            if (this.plain) {
                console.log(data);
            }
            else {
                console.log((0, helpers_1.prettyPrint)(data));
            }
        }
    }
    writeError(err) {
        ansiCursor.fg.red();
        console.log("[ERROR] " + err);
        ansiCursor.reset();
    }
    async executeScript(script) {
        const spinner = startSpinner();
        try {
            const data = await this.pipeline.exec(script, this.last_out, this.context);
            this.last_out = data;
            // TODO: Some more advanced output handling,
            // trim long lists with some ellipses
            this.writeSuccess(data);
        }
        catch (e) {
            this.writeError(e);
        }
        finally {
            spinner.stop();
        }
    }
    startReadline() {
        const repl = this;
        // Set up readline prompt
        const fn_names = Object.keys(repl.pipeline.fns || {}).concat(Object.keys(builtins));
        const fnCompleter = (line) => {
            const line_parts = line.trim().split(/\s+/);
            const to_complete_orig = line_parts.slice(-1)[0];
            let to_complete = to_complete_orig;
            const startsWith = (sofar) => (s) => s.toLowerCase().indexOf(sofar.toLowerCase()) === 0;
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
            ];
            let completions;
            if (to_complete.match("/")) {
                const base_dir = to_complete.split("/").slice(0, -1).join("/");
                const last_part = to_complete.split("/").slice(-1)[0];
                to_complete = last_part;
                completions = fs
                    .readdirSync(base_dir)
                    .filter(startsWith(last_part));
            }
            else {
                completions = fs
                    .readdirSync(".")
                    .filter(startsWith(to_complete));
            }
            if (!file_commands.includes(line_parts[0])) {
                completions = completions.concat(fn_names.filter(startsWith(to_complete)));
            }
            return [completions, to_complete];
        };
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            completer: fnCompleter,
        });
        const rlv = (0, readline_vim_1.default)(rl);
        this.rl = rl;
        this.context._readline = rl;
        // Overload readline's addHistory to save to our history file
        const rl_addHistory = rl._addHistory;
        rl._addHistory = function () {
            const last = rl.history[0];
            const line = rl_addHistory.call(rl);
            if (last !== line)
                saveHistory(line);
            return line;
        };
        // Bootstrap history from file
        loadHistory().then((saved_history) => {
            ;
            rl.history.push.apply(rl.history, saved_history);
        });
        const runScript = async (script) => {
            await repl.executeScript(script);
            if (run_once) {
                const script_exec = argv.exec || argv.e;
                if (script_exec) {
                    await repl.executeScript(script_exec);
                }
                process.exit();
            }
            else {
                this.updatePrompt();
                rl.prompt();
            }
        };
        this.updatePrompt();
        rl.prompt();
        // Interpret input as scripts and run
        const run_once = this.run_once || !process.stdin.isTTY;
        rl.on("line", (script) => {
            script = script.trim();
            if (!script.length)
                script = "id";
            runScript(script).catch((err) => {
                this.writeError(err);
                this.updatePrompt();
                rl.prompt();
            });
        });
        rl.on("close", () => {
            console.log("bye");
            process.exit();
        });
    }
    updatePrompt() {
        const time = "[" + (0, date_format_1.formatDate)(new Date(), "HH:mm") + "]";
        const cwd = process.cwd().replace(process.env.HOME || "", "~");
        const parts = [
            colorize(time, 90),
            colorize(cwd, 34),
            colorize("#| ", 36),
        ].join(" ");
        this.rl.setPrompt(parts);
    }
}
function defaultPipeline() {
    return new pipeline_1.Pipeline().use("http").use("html").use("files").use("keywords");
}
// Prompt helpers
function colorize(s, color) {
    const prefix = "\x1b[" + color + "m";
    const suffix = "\x1b[0m";
    return prefix + s + suffix;
}
// Loading spinner for slow commands. TTY-only so piped/scripted output
// stays clean, and debounced so fast commands never flash it.
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
function startSpinner() {
    if (!process.stdout.isTTY)
        return { stop: () => { } };
    let frame = 0;
    let visible = false;
    let interval;
    const draw = () => {
        process.stdout.write("\r" + colorize(SPINNER_FRAMES[frame], 36));
        visible = true;
        frame = (frame + 1) % SPINNER_FRAMES.length;
    };
    const delay = setTimeout(() => {
        draw();
        interval = setInterval(draw, 80);
    }, 100);
    return {
        stop: () => {
            clearTimeout(delay);
            if (interval)
                clearInterval(interval);
            if (visible)
                process.stdout.write("\r\x1b[K");
        },
    };
}
// History helpers
const history_path = path.resolve(getHomeDir(), ".pipeline_history");
function saveHistory(line) {
    fs.appendFileSync(history_path, line + "\n");
}
async function loadHistory() {
    try {
        const history_data = await fsp.readFile(history_path);
        const content = history_data.toString().trim();
        if (!content)
            return [];
        return content.split("\n").reverse();
    }
    catch {
        return [];
    }
}
// Going
if (require.main !== module) {
    // Module mode
    module.exports = PipelineREPL;
}
else {
    // Stand-alone mode
    const repl = new PipelineREPL();
    if (argv.plain || argv.p) {
        repl.plain = true;
    }
    const script_run_filename = argv.run || argv.r;
    if (script_run_filename) {
        const doRunScript = () => {
            // Execute single script
            const script = fs.readFileSync(script_run_filename).toString();
            setTimeout(async () => {
                try {
                    await repl.executeScript(script);
                }
                finally {
                    process.exit();
                }
            }, 50);
        };
        if (!process.stdin.isTTY) {
            // Try reading in piped
            let piped = "";
            process.stdin.on("data", (data) => {
                piped += data.toString();
            });
            process.stdin.on("end", () => {
                repl.last_out = piped.trim();
                doRunScript();
            });
        }
        else {
            doRunScript();
        }
    }
    else if (argv.load || argv.l) {
        const script_load_filename = argv.load || argv.l;
        // Execute single script
        console.log(`Reading from ${script_load_filename}...`);
        const script = fs.readFileSync(script_load_filename).toString();
        setTimeout(async () => {
            try {
                await repl.executeScript(script);
            }
            finally {
                repl.startReadline();
            }
        }, 50);
    }
    else {
        repl.startReadline();
    }
}
//# sourceMappingURL=repl.js.map