"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.btoa = exports.atob = void 0;
// Encodings and decodings
const atob = (inp, args, ctx, cb) => {
    const tob = Buffer.from(inp, "base64").toString("binary");
    cb(null, tob);
};
exports.atob = atob;
const btoa = (inp, args, ctx, cb) => {
    let buffer;
    if (inp instanceof Buffer) {
        buffer = inp;
    }
    else {
        buffer = Buffer.from(inp.toString(), "binary");
    }
    const toa = buffer.toString("base64");
    cb(null, toa);
};
exports.btoa = btoa;
//# sourceMappingURL=encodings.js.map