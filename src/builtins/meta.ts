import type { BuiltinMap } from "./common"
import { Lambda, command } from "../helpers"

// Introspection and escape hatches for the scope-first lookup order.
// The full builtin map is resolved lazily to avoid a load-time cycle
// with ./index (which aggregates this module).

function allBuiltins(): BuiltinMap {
    return require("./index")
}

const metaBuiltins: BuiltinMap = {
    // Run a builtin directly, bypassing any def/alias/module that
    // shadows it (like bash's `builtin`)
    builtin: command((inp, args, ctx) => {
        const [name, ...rest] = args
        const fn = allBuiltins()[name]
        if (!fn) {
            throw new Error(`No builtin ${name}. `)
        }
        return fn(inp, rest, ctx)
    }),

    // Report where a name resolves: def, alias, module, or builtin
    // (like bash's `type`)
    which: command((inp, args, ctx) => {
        const name = args.length ? String(args[0]) : String(inp)
        const fn = ctx.get("fns", name)
        const aliasSrc = ctx.get("aliases", name)
        const isBuiltin = allBuiltins()[name] != null
        if (fn != null) {
            const result: Record<string, any> = { command: name }
            if (aliasSrc != null) {
                result.type = "alias"
                result.src = aliasSrc
            } else if (fn instanceof Lambda) {
                result.type = "def"
                if (fn.src != null) result.src = fn.src
            } else {
                result.type = "module"
            }
            if (isBuiltin) result.shadows = "builtin"
            return result
        }
        if (isBuiltin) return { command: name, type: "builtin" }
        throw new Error(`No command ${name}. `)
    }),
}

export default metaBuiltins
