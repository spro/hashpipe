const grammar = require("./grammar")
import * as builtins from "./builtins"
import * as async from "async"
import * as fs from "fs"
import { inspect as utilInspect } from "util"
import * as _ from "underscore"
import { Callback, HashpipeFunction } from "./helpers"

const DEBUG = false

// Utility functions
const recv_ = (t: string, s: string) => console.log(`[${t.toUpperCase()}] ${s}`)
const _inspect = (o: any) => utilInspect(o, { depth: null })
const inspect = (o: any) => console.log(_inspect(o))

// Type definitions
export interface AtExpression {
    get?: any
    map?: any
    sub?: any[]
    depth?: number
}

export interface CommandToken {
    cmd?: any[]
    at?: AtExpression[]
    type?: string
    val?: any
    var?: string
    sub?: any[]
}

export interface ScopeInit {
    parent?: Scope
    vars?: Record<string, any>
    fns?: Record<string, HashpipeFunction>
    aliases?: Record<string, string>
    [key: string]: any
}

// Create a context that can be extended with `.use`

export class Scope {
    parent?: Scope
    vars?: Record<string, any>
    fns?: Record<string, HashpipeFunction>
    aliases?: Record<string, string>;
    [key: string]: any

    constructor(init: ScopeInit = {}) {
        Object.assign(this, init)
    }

    // Set a value on the current scope
    set(t: string, k: string, v: any): this {
        if (DEBUG) {
            console.log(`[Scope set] Setting ${t} ${k} to ${v}`)
        }
        if (this[t] == null) this[t] = {}
        this[t][k] = v
        return this
    }

    // Get a value from the current scope, falling back to parent scope
    get(t: string, k?: string): any {
        if (DEBUG) {
            console.log(`[Scope get] Getting ${t} ${k}`)
        }
        let got: any
        if (k != null) {
            got = this[t]?.[k]
        } else {
            got = this[t]
        }
        return got || this.parent?.get(t, k)
    }

    // Set an alias on the highest ranking scope
    alias(a: string, s: string): void {
        if (this.parent != null) {
            this.parent.alias(a, s)
        } else {
            this.set("fns", a, through(s))
            this.set("aliases", a, s)
        }
    }

    // Create a new child scope for this scope
    subScope(init: ScopeInit = {}): Scope {
        init.parent = this
        return new Scope(init)
    }

    topScope(): Scope {
        if (this.parent != null) {
            return this.parent.topScope()
        } else {
            return this
        }
    }
}

export class Context extends Scope {}

export class Pipeline extends Scope {
    private lastRegisteredFns: string[] = []

    use(fns: string | Record<string, HashpipeFunction>): this {
        const registerNamespace = (
            namespace: string,
            funcs: Record<string, any>,
        ) => {
            for (const [exportName, fn] of Object.entries(funcs)) {
                if (!_.isFunction(fn)) {
                    continue
                }

                const commandName = `${namespace}.${exportName}`
                this.set("fns", commandName, fn as HashpipeFunction)

                if (exportName === namespace) {
                    this.set("fns", namespace, fn as HashpipeFunction)
                    registered.push(namespace)
                } else {
                    registered.push(commandName)
                }
            }
        }

        const normalizeNamespace = (raw: string): string => {
            const sanitized = raw.replace(/[\\/]+/g, "/")
            const segments = sanitized.split("/").filter(Boolean)
            const leaf = segments.length ? segments[segments.length - 1] : raw
            return leaf.replace(/\.[^.]+$/, "")
        }

        let registered: string[] = []

        if (_.isString(fns)) {
            const request = fns
            let moduleName = request
            if (moduleName.match(/^\w/)) {
                moduleName = "./modules/" + moduleName
            }

            const namespace = normalizeNamespace(request)
            const moduleExports = require(moduleName)
            const exportEntries = Object.entries(moduleExports)

            if (
                exportEntries.length === 1 &&
                exportEntries[0][0] === "default" &&
                _.isObject(exportEntries[0][1])
            ) {
                registerNamespace(
                    namespace,
                    exportEntries[0][1] as Record<string, any>,
                )
            } else {
                registerNamespace(namespace, moduleExports)
            }
        } else if (_.isObject(fns)) {
            for (const [k, v] of Object.entries(fns)) {
                this.set("fns", k, v)
                registered.push(k)
            }
        }
        this.lastRegisteredFns = registered
        return this
    }

    getLastRegisteredFns(): string[] {
        return this.lastRegisteredFns.slice()
    }

    // Execute a pipeline given a command string, input object,
    // context and callback. An empty context object is created
    // if none is given.

    // exec(script, cb)
    // exec(script, inp, cb)
    // exec(script, inp, ctx, cb)

    exec(script: string, inp?: any, ctx?: any, cb?: Callback): Scope {
        // Handle overloaded signatures
        if (cb == null) {
            cb = ctx as Callback
            ctx = this.subScope()
        }
        if (cb == null) {
            cb = inp as Callback
            inp = null
        }

        try {
            const pipelines = parsePipelines(script)
            try {
                runPipelines(pipelines, inp, ctx, cb)
            } catch (e) {
                cb("Error executing pipeline: " + e)
            }
        } catch (e) {
            cb("Error parsing pipeline: " + e)
        }
        return ctx
    }

    execFile(script_filename: string, inp: any, ctx: any, cb: Callback): void {
        const script = fs.readFileSync(script_filename).toString()
        this.exec(script, inp, ctx, cb)
    }
}

// Parse a command pipeline into a series of tokens
// that can be passed to `runPipeline`

export function parsePipelines(cmd: string): any[] {
    return grammar.parse(cmd)
}

// Execute a parsed command pipeline, executing each part
// recursively by setting a callback that is either the next
// command in line or a final "stdout" callback

//        /~+~+~+~+~+~+~+~+~+~+~+~+~+\
//       |  PROCEED AT YOUR OWN RISK  |
//       |       dragons afoot        |
//        \+~+~+~+~+~+~+~+~+~+~+~+~+~/

function runPipelines(
    pipelines: any[],
    inp: any,
    ctx: Scope,
    cb: Callback,
): void {
    if (pipelines.length > 1) {
        const _runPipeline = (_pipeline: any, _cb: Callback) => {
            runPipeline(_pipeline, inp, ctx, _cb)
        }
        async.mapSeries(
            pipelines,
            _runPipeline,
            (err: any, results?: any[]) => {
                cb(err, results?.slice(-1)[0])
            },
        )
    } else {
        runPipeline(pipelines[0], inp, ctx, cb)
    }
}

export function runPipeline(
    _cmd_tokens: CommandToken[],
    inp: any,
    ctx: Scope,
    final_cb: Callback,
): void {
    if (DEBUG) {
        console.log("\n=== RUNNING PIPELINE ===")
        inspect(inp)
        console.log(" ---> ")
        inspect(_cmd_tokens)
        console.log("========================\n")
    }
    const cmd_tokens = _.clone(_cmd_tokens)
    const cmd_token = cmd_tokens.shift()!
    let cmd_args = cmd_token.cmd
    const cmd_type = cmd_token.type
    if (!cmd_args) cmd_args = ["id"]

    // Replace sub-commands and variables
    const parseArgs = (inp: any, args: any[], cb: Callback) => {
        if (DEBUG) {
            console.log("parsing args for " + _inspect(inp))
            console.log(":::> " + _inspect(args))
        }

        if (cmd_args[0] === "alias") {
            return cb(null, args)
        }

        const replaceArg = (arg: any, _cb: Callback) => {
            if (_.isObject(arg)) {
                if (arg.sub != null) {
                    return runPipelines(arg.sub, inp, ctx, _cb)
                } else if (arg.quoted != null) {
                    return parseArgs(
                        inp,
                        arg.quoted,
                        (err: Error | null, qargs?: any[]) => {
                            _cb(null, qargs?.join(" "))
                        },
                    )
                }
            } else if (_.isString(arg)) {
                // Int replacement
                const intMatch = arg.match(/^-?[0-9]+$/)
                if (intMatch) {
                    arg = parseInt(arg)
                }
                // Non replacement (escaped)
                else if (arg.match(/\\\$[a-zA-Z0-9_-]*$/)) {
                    arg = arg.slice(1)
                }
                // Within string replacement
                else {
                    let $key: RegExpMatchArray | null
                    while (($key = arg.match(/\$[!a-zA-Z0-9_-]+/))) {
                        const key_str = $key[0]
                        let val: any
                        if (key_str === "$!") {
                            val = inp
                        } else {
                            const key = key_str.slice(1)
                            val = ctx.get("vars", key)
                        }
                        arg = arg.replace(key_str, val)
                    }
                }
            }
            _cb(null, arg)
        }

        async.map(args, replaceArg, (err: any, new_args?: any[]) => {
            cb(null, new_args)
        })
    }

    // Apply an at expression at the end
    const applyAt = (data: any, cb: Callback) => {
        if (cmd_token.at != null) {
            if (cmd_type === "ppipe" || cmd_type === "spipe") {
                const _at = (_data: any, _cb: Callback) => {
                    at(_data, cmd_token.at!, ctx, _cb)
                }
                async.map(data, _at, cb)
            } else {
                at(data, cmd_token.at, ctx, cb)
            }
        } else {
            cb(null, data)
        }
    }

    // Check if we're at the final step
    let cb: Callback
    if (cmd_tokens.length === 0) {
        cb = (err: Error | null, ret?: any) => {
            if (DEBUG) {
                console.log(" ===> " + _inspect(ret))
            }
            if (err) {
                final_cb(err)
            } else {
                applyAt(ret, final_cb)
            }
        }
    } else {
        // Create a callback to continue the pipeline otherwise
        cb = (err: Error | null, ret?: any) => {
            applyAt(ret, (err: Error | null, ret?: any) => {
                runPipeline(cmd_tokens, ret, ctx, final_cb)
            })
        }
    }

    // Parse arguments and then execute

    // Parallel if ppiped
    if (cmd_type === "ppipe") {
        if (DEBUG) console.log("PPIPE: " + _inspect(cmd_args))
        const tasks = inp.map((_inp: any) => {
            return (_cb: Callback) => {
                parseArgs(_inp, cmd_args, (err: Error | null, args?: any[]) => {
                    doCmd(args!, _inp, ctx, _cb)
                })
            }
        })
        async.parallel(tasks, cb)
    }
    // Series if spiped
    else if (cmd_type === "spipe") {
        if (DEBUG) console.log("SPIPE: " + _inspect(cmd_args))
        const tasks = inp.map((_inp: any) => {
            return (_cb: Callback) => {
                parseArgs(_inp, cmd_args, (err: Error | null, args?: any[]) => {
                    doCmd(args!, _inp, ctx, _cb)
                })
            }
        })
        async.series(tasks, cb)
    }
    // Return literal value (number or string) if $val
    else if (cmd_token.val != null) {
        if (DEBUG) console.log("VAL: " + _inspect(cmd_args))
        parseArgs(inp, [cmd_token.val], (err: Error | null, parsed?: any[]) => {
            cb(null, parsed![0])
        })
    }
    // Return variable value if $var
    else if (cmd_token.var != null) {
        if (DEBUG) console.log("VAR: " + _inspect(cmd_args))
        const $key = cmd_token.var
        let val: any
        if ($key === "$!") {
            val = inp
        } else {
            const key = $key.slice(1)
            val = ctx.get("vars", key)
        }
        cb(null, val)
    }
    // Just execute if single piped
    else {
        if (DEBUG) console.log("PIPE: " + _inspect(cmd_args))
        parseArgs(inp, cmd_args, (err: Error | null, args?: any[]) => {
            doCmd(args!, inp, ctx, cb)
        })
    }
}

// Execute a given command by looking in `ctx.fns` for a function
// called `[cmd]` and passing that function the split arguments

export function doCmd(_args: any[], inp: any, ctx: Scope, cb: Callback): void {
    if (DEBUG) {
        console.log("\n##### DO CMD ######")
        inspect(_args)
        inspect(inp)
        console.log("###################\n")
    }
    const args = _.clone(_args)
    const cmd = args.shift()
    let fn = builtins[cmd]
    if (fn) {
        fn(inp, args, ctx, cb)
    } else if ((fn = ctx.get("fns", cmd))) {
        fn(inp, args, ctx, cb)
    } else {
        cb(`No command ${cmd}. `)
    }
}

// Splits a string into "arguments" by separating with whitespace
// while attempting to treat quoted strings as single arguments.
// TODO: Make a more robust grammar that can handle escaping, etc.

function splitArgs(s: string): string[] {
    const args: string[] = []
    s.trim().replace(/"([^"]*)"|'([^']*)'|(\S+)/g, (g0, g1, g2, g3) => {
        args.push(g1 || g2 || g3 || "")
        return g0
    })
    return args
}

// Map a function into array of arrays at a certain depth
function mapInto(
    l: any[],
    f: (item: any, cb: Callback) => void,
    d: number,
    cb: Callback,
): void {
    if (d === 1) {
        async.map(l, f, cb)
    } else {
        const _into = (_l: any[], _cb: Callback) => mapInto(_l, f, d - 1, _cb)
        async.map(l, _into, cb)
    }
}

//   , \-._ >._,_     _,_.< _.-/
//   (   )  \(-='(     )`--)/  (   _
//    `\-\_/-')\/'     `\/(`-\_/-/' `
//     <`)_--(_\_       _/_)--_('>

// Take an object and an expression and follow the expression
// tree down to the desired result
function descendObj(
    _obj: any,
    _expr: AtExpression[],
    ctx: Scope,
    final_cb: Callback,
): void {
    if (_obj == null) {
        return final_cb(null, undefined)
    }

    // This is me hoping Node has really good GC
    const obj = _.clone(_obj)
    const expr = _.clone(_expr)

    const step = expr.shift()
    if (DEBUG) {
        console.log("\n/ - - ~ @ ~ - - \\")
        inspect(obj)
        console.log("      == @ ==> ")
        inspect(step)
        console.log("\\ - - ~ @ ~ - - /\n")
    }

    // Check if we're at the final step
    let cb: Callback
    if (expr.length === 0) {
        cb = final_cb
    } else {
        cb = (err: Error | null, ret?: any) => {
            descendObj(ret, expr, ctx, final_cb)
        }
    }

    if (step == null) {
        cb(null, obj)
        return
    }

    // Map attributes
    if (step.map != null) {
        const map_get = (__obj: any, _cb: Callback) => {
            descendObj(__obj, [{ get: step.map }], ctx, _cb)
        }
        mapInto(obj, map_get, step.depth!, cb)
    }
    // Substitution
    else if (step.sub != null) {
        runPipelines(step.sub, obj, ctx, cb)
    }
    // Array result
    else if (_.isArray(step.get)) {
        const tasks = step.get.map((step_expr: any) => {
            return (_cb: Callback) => descendObj(obj, step_expr, ctx, _cb)
        })
        async.parallel(tasks, cb)
    }
    // Object result
    else if (_.isObject(step.get) && step.get.obj != null) {
        const tasks: Array<(cb: Callback) => void> = []
        for (const set of step.get.obj) {
            ;((set) => {
                const k = set.key
                const e = set.val

                if (_.isString(k)) {
                    // Key is a string, just get value
                    tasks.push((_cb: Callback) => {
                        // Check if value is a sub-command or an at-expression
                        if (e.sub != null) {
                            runPipelines(
                                e.sub,
                                obj,
                                ctx,
                                (err: Error | null, v_obj?: any) => {
                                    const dobj = {
                                        key: k,
                                        val: v_obj,
                                    }
                                    _cb(null, dobj)
                                },
                            )
                        } else {
                            descendObj(
                                obj,
                                e,
                                ctx,
                                (err: Error | null, v_obj?: any) => {
                                    const dobj = {
                                        key: k,
                                        val: v_obj,
                                    }
                                    _cb(null, dobj)
                                },
                            )
                        }
                    })
                } else {
                    // Key is an expression, get both key value and value value
                    tasks.push((_cb: Callback) => {
                        descendObj(
                            obj,
                            k,
                            ctx,
                            (err: Error | null, k_obj?: any) => {
                                // Check if value is a sub-command or an at-expression
                                if (e.sub != null) {
                                    runPipelines(
                                        e.sub,
                                        obj,
                                        ctx,
                                        (err: Error | null, v_obj?: any) => {
                                            const dobj = {
                                                key: k_obj,
                                                val: v_obj,
                                            }
                                            _cb(null, dobj)
                                        },
                                    )
                                } else {
                                    descendObj(
                                        obj,
                                        e,
                                        ctx,
                                        (err: Error | null, v_obj?: any) => {
                                            const dobj = {
                                                key: k_obj,
                                                val: v_obj,
                                            }
                                            _cb(null, dobj)
                                        },
                                    )
                                }
                            },
                        )
                    })
                }
            })(set)
        }

        // Combine results into single object
        async.parallel(tasks, (err: any, results?: any[]) => {
            const result_obj: Record<string, any> = {}
            for (const result of results!) {
                result_obj[result.key] = result.val
            }
            cb(null, result_obj)
        })
    }
    // Get attribute
    else {
        cb(null, accessor(obj, step.get))
    }
}

function accessor(obj: any, key: string): any {
    if (key === ".") {
        return obj
    } else {
        if (key.match(/^-?\d+/)) {
            let numKey = Number(key)
            // Pythonesque negative indexes
            if (numKey < 0) {
                return obj.slice(numKey)[0]
            }
            return obj[numKey]
        }
        return obj[key]
    }
}

// create a command out of a script
function through(cmd: string): HashpipeFunction {
    return (inp: any, args: any[], ctx: any, cb: Callback) => {
        const pipeline = parsePipelines(cmd)[0]
        if (pipeline[0].cmd != null) {
            pipeline[0].cmd.push(...args)
        }
        runPipeline(pipeline, inp, ctx, cb)
    }
}

// Read in an at expression
export function at(
    inp: any,
    expr: AtExpression[],
    ctx: Scope,
    cb: Callback,
): void {
    descendObj(inp, expr, ctx, cb)
}
