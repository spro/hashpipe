"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
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
    return (0, helpers_1.command)((inp, args) => combine(inp, args).reduce(op));
}
// Numeric strings coerce; anything else raises rather than becoming 0.
// The explicit `num` coercion command stays lenient by design.
function strict(opName) {
    return (v) => {
        const n = Number(v);
        if (Number.isNaN(n)) {
            throw `'${opName}' expects numbers, got ${JSON.stringify(v)}`;
        }
        return n;
    };
}
const addNum = strict("+");
const mulNum = strict("*");
const subNum = strict("-");
const divNum = strict("/");
const mathBuiltins = {
    num: (0, helpers_1.command)((inp) => (0, common_1.toNumber)(inp)),
    "+": reducer((a, b) => addNum(a) + addNum(b)),
    "*": reducer((a, b) => mulNum(a) * mulNum(b)),
    "-": reducer((a, b) => subNum(a) - subNum(b)),
    "/": reducer((a, b) => divNum(a) / divNum(b)),
    ".": reducer((a, b) => a + b),
};
exports.default = mathBuiltins;
//# sourceMappingURL=math.js.map