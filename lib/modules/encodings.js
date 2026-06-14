"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.btoa = exports.atob = void 0;
const helpers_1 = require("../helpers");
// Encodings and decodings
exports.atob = (0, helpers_1.command)((inp) => Buffer.from(inp, "base64").toString("binary"));
exports.btoa = (0, helpers_1.command)((inp) => {
    let buffer;
    if (inp instanceof Buffer) {
        buffer = inp;
    }
    else {
        buffer = Buffer.from(inp.toString(), "binary");
    }
    return buffer.toString("base64");
});
//# sourceMappingURL=encodings.js.map