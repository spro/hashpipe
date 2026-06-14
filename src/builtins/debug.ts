import { inspect } from "util"
import { BuiltinMap } from "./common"
import { command } from "../helpers"

// Diagnostics helpers that print pipeline state while preserving input.

const pretty = (value: any) => inspect(value, { depth: null })

const debugBuiltins: BuiltinMap = {
    tee: command((inp) => {
        console.log(pretty(inp))
        return inp
    }),
    log: command((inp, args) => {
        console.log(inp || args.join(" "))
        return inp
    }),
    inspect: command((inp, args) => {
        console.log("inp: " + pretty(inp))
        console.log("args: " + pretty(args))
        return inp
    }),
}

export default debugBuiltins
