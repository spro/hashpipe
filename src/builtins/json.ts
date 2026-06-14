import { BuiltinMap } from "./common"
import { command } from "../helpers"

// JSON encode/decode helpers used across modules.

const jsonBuiltins: BuiltinMap = {
    parse: command((inp) => JSON.parse(inp)),
    stringify: command((inp) => JSON.stringify(inp)),
}

export default jsonBuiltins
