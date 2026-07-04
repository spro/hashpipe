import type { Pipeline } from "../pipeline"
import { Lambda, command } from "../helpers"
import { BuiltinMap } from "./common"
import { isObject, isString } from "../utils/lang"

// State management and module loading helpers that mutate the scope.

const environmentBuiltins: BuiltinMap = {
    set: command((inp, args, ctx) => {
        const data = args[1] || inp
        ctx.set("vars", args[0], data)
        return data
    }),
    setall: command((inp, args, ctx) => {
        const data = args[1] || inp
        for (const [key, value] of Object.entries(data)) {
            ctx.set("vars", key, value)
        }
        return data
    }),
    inc: command((inp, args, ctx) => {
        const key = args[0]
        if (ctx[key] == null) ctx[key] = 0
        return ++ctx[key]
    }),
    push: command((inp, args, ctx) => {
        const data = args[1] || inp
        const list = ctx.get("vars", args[0]) || []
        list.push(data)
        ctx.set("vars", args[0], list)
        return list
    }),
    ginc: command((inp, args, ctx) => {
        const groupKey = args[0]
        const objKey = args[1]
        if (ctx[groupKey] == null) {
            ctx[groupKey] = { val: 0, objs: {} }
        }
        if (ctx[groupKey].objs[objKey] != null) {
            return ctx[groupKey].objs[objKey]
        }
        const value = ++ctx[groupKey].val
        ctx[groupKey].objs[objKey] = value
        return value
    }),
    use: command((inp, args, ctx) => {
        const imported: string[] = []
        const shadowed: string[] = []
        const topScope = ctx.topScope()
        const pipeline = topScope as Pipeline & {
            getLastRegisteredFns?: () => string[]
            getLastShadowedFns?: () => string[]
        }
        for (const entry of args) {
            pipeline.use(entry)
            if (typeof pipeline.getLastRegisteredFns === "function") {
                imported.push(...pipeline.getLastRegisteredFns())
            }
            if (typeof pipeline.getLastShadowedFns === "function") {
                shadowed.push(...pipeline.getLastShadowedFns())
            }
        }
        const unique = [...new Set(imported)]
        const messageItems = unique.length ? unique : args
        let message = "Using: " + messageItems.join(", ")
        if (shadowed.length) {
            message += " (shadowing: " + [...new Set(shadowed)].join(", ") + ")"
        }
        return message
    }),
    def: command((inp, args, ctx) => {
        const name = args[0]
        const lam = args[1]
        if (!(lam instanceof Lambda)) {
            throw new Error(
                `def: second argument must be a lambda, e.g. def ${name} {| ... |}`,
            )
        }
        ctx.topScope().set("fns", name, lam)
        return {
            success: true,
            def: name,
            src: lam.src,
        }
    }),
    alias: command((inp, args, ctx) => {
        const alias = args[0]
        const script = args[1]
        if (!script) {
            return ctx.get("aliases", alias)
        }
        ctx.alias(alias, script)
        return {
            success: true,
            alias,
            script: script instanceof Lambda ? script.src : script,
        }
    }),
    aliases: command((inp, args, ctx) => {
        // Only a map of alias scripts imports (every value a string);
        // piped command results and anything else fall through to
        // listing. The REPL pipes the previous result in, so `aliases`
        // right after another command must still list.
        const entries = isObject(inp) ? Object.entries(inp) : []
        const isAliasMap =
            entries.length > 0 && entries.every(([, v]) => isString(v))
        if (!isAliasMap) {
            return ctx.get("aliases")
        }
        for (const [alias, script] of entries) {
            ctx.alias(alias, script as string)
        }
        return {
            success: true,
            aliases: inp,
        }
    }),
}

export default environmentBuiltins
