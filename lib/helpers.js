"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prettyPrint = prettyPrint;
exports.wrapone = wrapone;
exports.wraponeSync = wraponeSync;
exports.wrapall = wrapall;
const util_1 = require("util");
function prettyPrint(o) {
    if (typeof o === "object") {
        return (0, util_1.inspect)(o, { depth: null, colors: true });
    }
    else {
        return String(o);
    }
}
function wrapone(f, with_inp = false) {
    return (inp, args, ctx, cb) => {
        if (with_inp) {
            args.unshift(inp);
        }
        f(...args, cb);
    };
}
function wraponeSync(f, with_inp = false) {
    return (inp, args, ctx, cb) => {
        if (with_inp) {
            args.unshift(inp);
        }
        cb(null, f(...args));
    };
}
function wrapall(o, pre = "", with_inp = false, sync = false) {
    const wo = {};
    for (const [k, f] of Object.entries(o)) {
        if (typeof f === "function") {
            const wrapf = sync ? wraponeSync : wrapone;
            wo[pre + k] = wrapf(f, with_inp);
        }
    }
    return wo;
}
//# sourceMappingURL=helpers.js.map