import { BuiltinMap } from "./common"

// JSON encode/decode helpers used across modules.

const jsonBuiltins: BuiltinMap = {
    parse: (inp, args, ctx, cb) => {
        cb(null, JSON.parse(inp))
    },
    stringify: (inp, args, ctx, cb) => {
        cb(null, JSON.stringify(inp))
    },
}

export default jsonBuiltins
