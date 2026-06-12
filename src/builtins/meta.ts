import type { BuiltinMap } from "./common"
import { Lambda } from "../helpers"

// Introspection and escape hatches for the scope-first lookup order.
// The full builtin map is resolved lazily to avoid a load-time cycle
// with ./index (which aggregates this module).

function allBuiltins(): BuiltinMap {
    return require("./index")
}

const metaBuiltins: BuiltinMap = {
    // Run a builtin directly, bypassing any def/alias/module that
    // shadows it (like bash's `builtin`)
    builtin: (inp, args, ctx, cb) => {
        const [name, ...rest] = args
        const fn = allBuiltins()[name]
        if (!fn) return cb(`No builtin ${name}. `)
        fn(inp, rest, ctx, cb)
    },

    // Report where a name resolves: def, alias, module, or builtin
    // (like bash's `type`)
    which: (inp, args, ctx, cb) => {
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
            return cb(null, result)
        }
        if (isBuiltin) return cb(null, { command: name, type: "builtin" })
        cb(`No command ${name}. `)
    },
}

export default metaBuiltins
