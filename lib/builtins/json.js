"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
// JSON encode/decode helpers used across modules.
const jsonBuiltins = {
    parse: (0, helpers_1.command)((inp) => JSON.parse(inp)),
    stringify: (0, helpers_1.command)((inp) => JSON.stringify(inp)),
};
exports.default = jsonBuiltins;
//# sourceMappingURL=json.js.map