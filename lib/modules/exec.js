"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnCommands = exports.spawn = exports.cmd = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const helpers_1 = require("../helpers");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const known_spawn = "ls cp mv ln ps grep awk sed find kill mkdir touch vim tmux th coffee node python pm2 npm git make ssh scp sudo".split(" ");
// Create exports for known spawn commands
const spawnCommands = {};
exports.spawnCommands = spawnCommands;
known_spawn.forEach((k) => {
    spawnCommands[k] = (0, helpers_1.command)((inp, args, ctx) => {
        if (process.stdin.setRawMode)
            process.stdin.setRawMode(false);
        ctx._readline?.pause();
        const child = (0, child_process_1.spawn)(k, args, {
            stdio: "inherit",
            cwd: process.cwd(),
            env: process.env,
        });
        return new Promise((resolve, reject) => {
            const restore = () => {
                if (process.stdin.setRawMode)
                    process.stdin.setRawMode(true);
                ctx._readline?.prompt();
            };
            child.on("error", (err) => {
                restore();
                reject(err);
            });
            child.on("exit", () => {
                restore();
                resolve();
            });
        });
    });
});
exports.cmd = (0, helpers_1.command)(async (inp, args) => {
    const { stdout } = await execAsync(args.join(" "));
    return stdout;
});
exports.spawn = (0, helpers_1.command)((inp, args, ctx) => {
    if (process.stdin.setRawMode)
        process.stdin.setRawMode(false);
    ctx._readline?.pause();
    let spawnArgs = args;
    if (args.length === 1) {
        spawnArgs = args[0].split(" ");
    }
    const child = (0, child_process_1.spawn)(spawnArgs[0], spawnArgs.slice(1), {
        stdio: "inherit",
        cwd: process.cwd(),
        env: process.env,
    });
    return new Promise((resolve, reject) => {
        const restore = () => {
            if (process.stdin.setRawMode)
                process.stdin.setRawMode(true);
            ctx._readline?.prompt();
        };
        child.on("error", (err) => {
            restore();
            reject(err);
        });
        child.on("exit", () => {
            restore();
            resolve();
        });
    });
});
// Export all spawn commands
Object.assign(exports, spawnCommands);
//# sourceMappingURL=exec.js.map