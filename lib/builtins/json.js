"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// JSON encode/decode helpers used across modules.
const jsonBuiltins = {
    parse: (inp, args, ctx, cb) => {
        cb(null, JSON.parse(inp));
    },
    stringify: (inp, args, ctx, cb) => {
        cb(null, JSON.stringify(inp));
    },
};
exports.default = jsonBuiltins;
//# sourceMappingURL=json.js.map