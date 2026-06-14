"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const helpers_1 = require("../helpers");
// Diagnostics helpers that print pipeline state while preserving input.
const pretty = (value) => (0, util_1.inspect)(value, { depth: null });
const debugBuiltins = {
    tee: (0, helpers_1.command)((inp) => {
        console.log(pretty(inp));
        return inp;
    }),
    log: (0, helpers_1.command)((inp, args) => {
        console.log(inp || args.join(" "));
        return inp;
    }),
    inspect: (0, helpers_1.command)((inp, args) => {
        console.log("inp: " + pretty(inp));
        console.log("args: " + pretty(args));
        return inp;
    }),
};
exports.default = debugBuiltins;
//# sourceMappingURL=debug.js.map