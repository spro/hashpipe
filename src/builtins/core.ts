import { Callback } from "../helpers"
import { BuiltinMap, toBoolean } from "./common"

// Core control-flow and simple value helpers.

const coreBuiltins: BuiltinMap = {
    id: (inp, args, ctx, cb) => {
        cb(null, inp)
    },
    val: (inp, args, ctx, cb) => {
        cb(null, args[0])
    },
    or: (inp, args, ctx, cb) => {
        cb(null, inp || args[0])
    },
    echo: (inp, args, ctx, cb) => {
        cb(null, args.join(" "))
    },
    key: (inp, args, ctx, cb) => {
        cb(null, args.join(""))
    },
    null: (inp, args, ctx, cb) => {
        cb(null, null)
    },
    if: (inp, args, ctx, cb: Callback) => {
        if (args[0]) {
            cb(null, args[1])
        } else {
            cb(null)
        }
    },
    case: (inp, args, ctx, cb) => {
        const key = args[0]
        const cases = args[1] || {}
        cb(null, cases[key])
    },
    bool: (inp, args, ctx, cb) => {
        cb(null, toBoolean(inp))
    },
}

export default coreBuiltins
