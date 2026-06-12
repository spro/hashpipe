"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
const common_1 = require("./common");
// Core control-flow and simple value helpers.
const coreBuiltins = {
    id: (inp, args, ctx, cb) => {
        cb(null, inp);
    },
    val: (inp, args, ctx, cb) => {
        cb(null, args[0]);
    },
    or: (inp, args, ctx, cb) => {
        cb(null, inp || args[0]);
    },
    echo: (inp, args, ctx, cb) => {
        cb(null, args.join(" "));
    },
    key: (inp, args, ctx, cb) => {
        cb(null, args.join(""));
    },
    null: (inp, args, ctx, cb) => {
        cb(null, null);
    },
    if: (inp, args, ctx, cb) => {
        const branch = (0, common_1.toBoolean)(args[0]) ? args[1] : args[2];
        // Lambda branches are lazy: only the taken branch ever runs
        if (branch instanceof helpers_1.Lambda) {
            branch.call(inp, [], cb);
        }
        else {
            cb(null, branch);
        }
    },
    call: (inp, args, ctx, cb) => {
        const callable = (0, common_1.resolveCallable)(args[0], ctx);
        if (!callable) {
            return cb(`call: not a function: ${args[0]}`);
        }
        callable(inp, args.slice(1), cb);
    },
    case: (inp, args, ctx, cb) => {
        const key = args[0];
        const cases = args[1] || {};
        cb(null, cases[key]);
    },
    bool: (inp, args, ctx, cb) => {
        cb(null, (0, common_1.toBoolean)(inp));
    },
};
exports.default = coreBuiltins;
//# sourceMappingURL=core.js.map