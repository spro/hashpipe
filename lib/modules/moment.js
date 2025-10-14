"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.format_date = void 0;
const moment_1 = __importDefault(require("moment"));
const format_date = (inp, args, ctx, cb) => {
    cb(null, (0, moment_1.default)(inp).format(args[0]));
};
exports.format_date = format_date;
//# sourceMappingURL=moment.js.map