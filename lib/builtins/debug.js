"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
// Diagnostics helpers that print pipeline state while preserving input.
const pretty = (value) => (0, util_1.inspect)(value, { depth: null });
const debugBuiltins = {
    tee: (inp, args, ctx, cb) => {
        console.log(pretty(inp));
        cb(null, inp);
    },
    log: (inp, args, ctx, cb) => {
        console.log(inp || args.join(" "));
        cb(null, inp);
    },
    inspect: (inp, args, ctx, cb) => {
        console.log("inp: " + pretty(inp));
        console.log("args: " + pretty(args));
        cb(null, inp);
    },
};
exports.default = debugBuiltins;
//# sourceMappingURL=debug.js.map