import { BuiltinMap } from "./common"
import { command } from "../helpers"

// String casing and formatting helpers.

function capitalize(input: string): string {
    return input[0].toUpperCase() + input.slice(1)
}

const stringBuiltins: BuiltinMap = {
    upper: command((inp) => inp.toUpperCase()),
    lower: command((inp) => inp.toLowerCase()),
    capitalize: command((inp) => capitalize(inp)),
    string: command((inp) => inp.toString()),
    trim: command((inp, args) => (args[0] || inp).trim()),
}

export default stringBuiltins
