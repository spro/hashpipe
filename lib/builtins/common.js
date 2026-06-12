"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCallable = resolveCallable;
exports.toNumber = toNumber;
exports.toBoolean = toBoolean;
const helpers_1 = require("../helpers");
// Resolve an argument into something invokable: a lambda value, a function,
// or the name of a command in scope. Returns null if it isn't callable.
function resolveCallable(arg, ctx) {
    if (arg instanceof helpers_1.Lambda) {
        return (inp, args, cb) => arg.call(inp, args, cb);
    }
    if (typeof arg === "function") {
        return (inp, args, cb) => arg(inp, args, ctx, cb);
    }
    if (typeof arg === "string" && ctx && typeof ctx.get === "function") {
        const fn = ctx.get("fns", arg);
        if (fn instanceof helpers_1.Lambda) {
            return (inp, args, cb) => fn.call(inp, args, cb);
        }
        if (typeof fn === "function") {
            return (inp, args, cb) => fn(inp, args, ctx, cb);
        }
    }
    return null;
}
function toNumber(value) {
    return Number(value) || 0;
}
function toBoolean(value) {
    if (typeof value === "string") {
        if (value === "false")
            return false;
        if (value === "true")
            return true;
    }
    return !!value;
}
//# sourceMappingURL=common.js.map