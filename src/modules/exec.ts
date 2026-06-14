import { exec, spawn as spawnProcess } from "child_process"
import { promisify } from "util"
import { HashpipeFunction, command } from "../helpers"

const execAsync = promisify(exec)

const known_spawn =
    "ls cp mv ln ps grep awk sed find kill mkdir touch vim tmux th coffee node python pm2 npm git make ssh scp sudo".split(
        " ",
    )

// Create exports for known spawn commands
const spawnCommands: Record<string, HashpipeFunction> = {}
known_spawn.forEach((k) => {
    spawnCommands[k] = command((inp: any, args: any[], ctx: any) => {
        if (process.stdin.setRawMode) process.stdin.setRawMode(false)
        ctx._readline?.pause()
        const child = spawnProcess(k, args, {
            stdio: "inherit",
            cwd: process.cwd(),
            env: process.env,
        })

        return new Promise<void>((resolve, reject) => {
            const restore = () => {
                if (process.stdin.setRawMode) process.stdin.setRawMode(true)
                ctx._readline?.prompt()
            }
            child.on("error", (err) => {
                restore()
                reject(err)
            })
            child.on("exit", () => {
                restore()
                resolve()
            })
        })
    })
})

export const cmd: HashpipeFunction = command(async (inp, args) => {
    const { stdout } = await execAsync(args.join(" "))
    return stdout
})

export const spawn: HashpipeFunction = command((inp, args, ctx) => {
    if (process.stdin.setRawMode) process.stdin.setRawMode(false)
    ctx._readline?.pause()

    let spawnArgs = args
    if (args.length === 1) {
        spawnArgs = args[0].split(" ")
    }

    const child = spawnProcess(spawnArgs[0], spawnArgs.slice(1), {
        stdio: "inherit",
        cwd: process.cwd(),
        env: process.env,
    })

    return new Promise<void>((resolve, reject) => {
        const restore = () => {
            if (process.stdin.setRawMode) process.stdin.setRawMode(true)
            ctx._readline?.prompt()
        }
        child.on("error", (err) => {
            restore()
            reject(err)
        })
        child.on("exit", () => {
            restore()
            resolve()
        })
    })
})

// Export all spawn commands
Object.assign(exports, spawnCommands)
export { spawnCommands }
