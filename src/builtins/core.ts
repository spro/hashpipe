import { Lambda, command } from "../helpers"
import { BuiltinMap, resolveCallable, toBoolean } from "./common"

// Core control-flow and simple value helpers.

const coreBuiltins: BuiltinMap = {
    id: command((inp) => inp),
    val: command((inp, args) => args[0]),
    or: command((inp, args) => inp || args[0]),
    echo: command((inp, args) => args.join(" ")),
    key: command((inp, args) => args.join("")),
    null: command(() => null),
    if: command((inp, args) => {
        const branch = toBoolean(args[0]) ? args[1] : args[2]
        // Lambda branches are lazy: only the taken branch ever runs
        if (branch instanceof Lambda) {
            return branch.call(inp, [])
        }
        return branch
    }),
    call: command((inp, args, ctx) => {
        const callable = resolveCallable(args[0], ctx)
        if (!callable) {
            throw new Error(`call: not a function: ${args[0]}`)
        }
        return callable(inp, args.slice(1))
    }),
    case: command((inp, args) => {
        const key = args[0]
        const cases = args[1] || {}
        return cases[key]
    }),
    bool: command((inp) => toBoolean(inp)),
}

export default coreBuiltins
