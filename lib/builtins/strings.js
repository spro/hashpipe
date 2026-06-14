"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
// String casing and formatting helpers.
function capitalize(input) {
    return input[0].toUpperCase() + input.slice(1);
}
const stringBuiltins = {
    upper: (0, helpers_1.command)((inp) => inp.toUpperCase()),
    lower: (0, helpers_1.command)((inp) => inp.toLowerCase()),
    capitalize: (0, helpers_1.command)((inp) => capitalize(inp)),
    string: (0, helpers_1.command)((inp) => inp.toString()),
    trim: (0, helpers_1.command)((inp, args) => (args[0] || inp).trim()),
};
exports.default = stringBuiltins;
//# sourceMappingURL=strings.js.map