"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
const common_1 = require("./common");
// Core control-flow and simple value helpers.
const coreBuiltins = {
    id: (0, helpers_1.command)((inp) => inp),
    val: (0, helpers_1.command)((inp, args) => args[0]),
    or: (0, helpers_1.command)((inp, args) => inp || args[0]),
    echo: (0, helpers_1.command)((inp, args) => args.join(" ")),
    key: (0, helpers_1.command)((inp, args) => args.join("")),
    null: (0, helpers_1.command)(() => null),
    if: (0, helpers_1.command)((inp, args) => {
        const branch = (0, common_1.toBoolean)(args[0]) ? args[1] : args[2];
        // Lambda branches are lazy: only the taken branch ever runs
        if (branch instanceof helpers_1.Lambda) {
            return branch.call(inp, []);
        }
        return branch;
    }),
    call: (0, helpers_1.command)((inp, args, ctx) => {
        const callable = (0, common_1.resolveCallable)(args[0], ctx);
        if (!callable) {
            throw new Error(`call: not a function: ${args[0]}`);
        }
        return callable(inp, args.slice(1));
    }),
    case: (0, helpers_1.command)((inp, args) => {
        const key = args[0];
        const cases = args[1] || {};
        return cases[key];
    }),
    bool: (0, helpers_1.command)((inp) => (0, common_1.toBoolean)(inp)),
};
exports.default = coreBuiltins;
//# sourceMappingURL=core.js.map