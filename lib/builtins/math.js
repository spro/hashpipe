"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
const lang_1 = require("../utils/lang");
// Numeric coercions and arithmetic reducers.
function isValid(value) {
    if (Array.isArray(value))
        return value.length > 0;
    if ((0, lang_1.isObject)(value))
        return Object.keys(value).length > 0;
    if ((0, lang_1.isString)(value))
        return value.length > 0;
    return value != null;
}
function combine(inp, args) {
    return (0, lang_1.flattenOnce)([inp, ...args]).filter(isValid);
}
function reducer(op) {
    return (inp, args, ctx, cb) => {
        cb(null, combine(inp, args).reduce(op));
    };
}
const mathBuiltins = {
    num: (inp, args, ctx, cb) => {
        cb(null, (0, common_1.toNumber)(inp));
    },
    "+": reducer((a, b) => (0, common_1.toNumber)(a) + (0, common_1.toNumber)(b)),
    "*": reducer((a, b) => (0, common_1.toNumber)(a) * (0, common_1.toNumber)(b)),
    "-": reducer((a, b) => (0, common_1.toNumber)(a) - (0, common_1.toNumber)(b)),
    "/": reducer((a, b) => (0, common_1.toNumber)(a) / (0, common_1.toNumber)(b)),
    ".": reducer((a, b) => a + b),
};
exports.default = mathBuiltins;
//# sourceMappingURL=math.js.map