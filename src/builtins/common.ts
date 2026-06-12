import type { Callback, HashpipeFunction } from "../helpers"
import { Lambda } from "../helpers"

// Shared helpers and types reused across builtin modules.
export type BuiltinMap = Record<string, HashpipeFunction>

// A resolved callable for higher-order builtins, with the scope baked in.
export type Callable = (inp: any, args: any[], cb: Callback) => void

// Resolve an argument into something invokable: a lambda value, a function,
// or the name of a command in scope. Returns null if it isn't callable.
export function resolveCallable(arg: any, ctx: any): Callable | null {
    if (arg instanceof Lambda) {
        return (inp, args, cb) => arg.call(inp, args, cb)
    }
    if (typeof arg === "function") {
        return (inp, args, cb) => arg(inp, args, ctx, cb)
    }
    if (typeof arg === "string" && ctx && typeof ctx.get === "function") {
        const fn = ctx.get("fns", arg)
        if (fn instanceof Lambda) {
            return (inp, args, cb) => fn.call(inp, args, cb)
        }
        if (typeof fn === "function") {
            return (inp, args, cb) => fn(inp, args, ctx, cb)
        }
    }
    return null
}

export function toNumber(value: any): number {
    return Number(value) || 0
}

export function toBoolean(value: any): boolean {
    if (typeof value === "string") {
        if (value === "false") return false
        if (value === "true") return true
    }
    return !!value
}
