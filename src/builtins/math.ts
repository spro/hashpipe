import type { HashpipeFunction } from "../helpers"
import { command } from "../helpers"
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
    return command((inp: any, args: any[]) => combine(inp, args).reduce(op))
}

// Numeric strings coerce; anything else raises rather than becoming 0.
// The explicit `num` coercion command stays lenient by design.
function strict(opName: string): (v: any) => number {
    return (v: any) => {
        const n = Number(v)
        if (Number.isNaN(n)) {
            throw `'${opName}' expects numbers, got ${JSON.stringify(v)}`
        }
        return n
    }
}

const addNum = strict("+")
const mulNum = strict("*")
const subNum = strict("-")
const divNum = strict("/")

const mathBuiltins: BuiltinMap = {
    num: command((inp) => toNumber(inp)),
    "+": reducer((a, b) => addNum(a) + addNum(b)),
    "*": reducer((a, b) => mulNum(a) * mulNum(b)),
    "-": reducer((a, b) => subNum(a) - subNum(b)),
    "/": reducer((a, b) => divNum(a) / divNum(b)),
    ".": reducer((a, b) => a + b),
}

export default mathBuiltins
