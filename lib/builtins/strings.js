"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// String casing and formatting helpers.
function capitalize(input) {
    return input[0].toUpperCase() + input.slice(1);
}
const stringBuiltins = {
    upper: (inp, args, ctx, cb) => {
        cb(null, inp.toUpperCase());
    },
    lower: (inp, args, ctx, cb) => {
        cb(null, inp.toLowerCase());
    },
    capitalize: (inp, args, ctx, cb) => {
        cb(null, capitalize(inp));
    },
    string: (inp, args, ctx, cb) => {
        cb(null, inp.toString());
    },
    trim: (inp, args, ctx, cb) => {
        cb(null, (args[0] || inp).trim());
    },
};
exports.default = stringBuiltins;
//# sourceMappingURL=strings.js.map