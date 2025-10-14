"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replace = void 0;
const replace = (inp, args, ctx, cb) => {
    cb(null, inp.replace(args[0], args[1]));
};
exports.replace = replace;
//# sourceMappingURL=replace.js.map