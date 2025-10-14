"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnCommands = exports.spawn = exports.cmd = void 0;
const child_process_1 = require("child_process");
const known_spawn = "ls cp mv ln ps grep awk sed find kill mkdir touch vim tmux th coffee node python pm2 npm git make ssh scp sudo".split(" ");
// Create exports for known spawn commands
const spawnCommands = {};
exports.spawnCommands = spawnCommands;
known_spawn.forEach((k) => {
    spawnCommands[k] = (inp, args, ctx, cb) => {
        if (process.stdin.setRawMode)
            process.stdin.setRawMode(false);
        ctx._readline?.pause();
        const child = (0, child_process_1.spawn)(k, args, {
            stdio: "inherit",
            cwd: process.cwd(),
            env: process.env,
        });
        child.on("exit", (e, code) => {
            if (process.stdin.setRawMode)
                process.stdin.setRawMode(true);
            ctx._readline?.prompt();
            cb(null);
        });
    };
});
const cmd = (inp, args, ctx, cb) => {
    (0, child_process_1.exec)(args.join(" "), (err, stdout, stderr) => {
        cb(null, stdout);
    });
};
exports.cmd = cmd;
const spawn = (inp, args, ctx, cb) => {
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
    child.on("error", (err) => {
        if (process.stdin.setRawMode)
            process.stdin.setRawMode(true);
        ctx._readline?.prompt();
        cb(err);
    });
    child.on("exit", (e, code) => {
        if (process.stdin.setRawMode)
            process.stdin.setRawMode(true);
        ctx._readline?.prompt();
        cb(null);
    });
};
exports.spawn = spawn;
// Export all spawn commands
Object.assign(exports, spawnCommands);
//# sourceMappingURL=exec.js.map