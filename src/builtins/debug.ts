import { inspect } from "util"
import { BuiltinMap } from "./common"

// Diagnostics helpers that print pipeline state while preserving input.

const pretty = (value: any) => inspect(value, { depth: null })

const debugBuiltins: BuiltinMap = {
    tee: (inp, args, ctx, cb) => {
        console.log(pretty(inp))
        cb(null, inp)
    },
    log: (inp, args, ctx, cb) => {
        console.log(inp || args.join(" "))
        cb(null, inp)
    },
    inspect: (inp, args, ctx, cb) => {
        console.log("inp: " + pretty(inp))
        console.log("args: " + pretty(args))
        cb(null, inp)
    },
}

export default debugBuiltins
