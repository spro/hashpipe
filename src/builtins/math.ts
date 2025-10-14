import type { Callback } from "../helpers"
import type { HashpipeFunction } from "../helpers"
import { BuiltinMap, toNumber } from "./common"
import { flattenOnce, isObject, isString } from "../utils/lang"

// Numeric coercions and arithmetic reducers.

function isValid(value: any): boolean {
    if (Array.isArray(value)) return value.length > 0
    if (isObject(value)) return Object.keys(value).length > 0
    if (isString(value)) return value.length > 0
    return value != null
}

function combine(inp: any, args: any[]): any[] {
    return flattenOnce([inp, ...args]).filter(isValid)
}

function reducer(op: (a: any, b: any) => any): HashpipeFunction {
    return (inp: any, args: any[], ctx: any, cb: Callback) => {
        cb(null, combine(inp, args).reduce(op))
    }
}

const mathBuiltins: BuiltinMap = {
    num: (inp, args, ctx, cb) => {
        cb(null, toNumber(inp))
    },
    "+": reducer((a, b) => toNumber(a) + toNumber(b)),
    "*": reducer((a, b) => toNumber(a) * toNumber(b)),
    "-": reducer((a, b) => toNumber(a) - toNumber(b)),
    "/": reducer((a, b) => toNumber(a) / toNumber(b)),
    ".": reducer((a, b) => a + b),
}

export default mathBuiltins
