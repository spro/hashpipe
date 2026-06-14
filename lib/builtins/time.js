"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
const date_format_1 = require("../utils/date-format");
// Time helpers for scheduling and timestamps.
const timeBuiltins = {
    sleep: (0, helpers_1.command)((inp, args) => new Promise((resolve) => {
        setTimeout(() => resolve(inp), Number(args[0]));
    })),
    now: (0, helpers_1.command)(() => new Date()),
    timestamp: (0, helpers_1.command)(() => new Date().getTime()),
    "oid-timestamp": (0, helpers_1.command)((inp, args) => {
        const value = (args[0] || inp).toString().substring(0, 8);
        return parseInt(value, 16) * 1000;
    }),
    "format-date": (0, helpers_1.command)((inp, args) => {
        const value = inp ?? new Date();
        const pattern = args[0] || "YYYY-MM-DD HH:mm:ss";
        return (0, date_format_1.formatDate)(value, pattern);
    }),
};
exports.default = timeBuiltins;
//# sourceMappingURL=time.js.map