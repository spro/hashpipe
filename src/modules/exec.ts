import { exec, spawn } from "child_process"
import { HashpipeFunction } from "../helpers"

const known_spawn =
    "ls cp mv ln ps grep awk sed find kill mkdir touch vim tmux th coffee node python pm2 npm git make ssh scp sudo".split(
        " ",
    )

// Create exports for known spawn commands
const spawnCommands: Record<string, HashpipeFunction> = {}
known_spawn.forEach((k) => {
    spawnCommands[k] = (inp: any, args: any[], ctx: any, cb: any) => {
        if (process.stdin.setRawMode) process.stdin.setRawMode(false)
        ctx._readline?.pause()
        const child = spawn(k, args, {
            stdio: "inherit",
            cwd: process.cwd(),
            env: process.env,
        })

        child.on("exit", (e, code) => {
            if (process.stdin.setRawMode) process.stdin.setRawMode(true)
            ctx._readline?.prompt()
            cb(null)
        })
    }
})

export const exec_cmd: HashpipeFunction = (inp, args, ctx, cb) => {
    exec(args.join(" "), (err, stdout, stderr) => {
        cb(null, stdout)
    })
}

export const spawn_cmd: HashpipeFunction = (inp, args, ctx, cb) => {
    if (process.stdin.setRawMode) process.stdin.setRawMode(false)
    ctx._readline?.pause()

    let spawnArgs = args
    if (args.length === 1) {
        spawnArgs = args[0].split(" ")
    }

    const child = spawn(spawnArgs[0], spawnArgs.slice(1), {
        stdio: "inherit",
        cwd: process.cwd(),
        env: process.env,
    })

    child.on("error", (err) => {
        if (process.stdin.setRawMode) process.stdin.setRawMode(true)
        ctx._readline?.prompt()
        cb(err)
    })

    child.on("exit", (e, code) => {
        if (process.stdin.setRawMode) process.stdin.setRawMode(true)
        ctx._readline?.prompt()
        cb(null)
    })
}

// Export all spawn commands
Object.assign(exports, spawnCommands)
export { spawnCommands }
