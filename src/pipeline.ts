const grammar = require("./grammar")
import * as builtins from "./builtins"
import * as async from "async"
import * as fs from "fs"
import { inspect as utilInspect } from "util"
import { cloneShallow, isFunction, isObject, isString } from "./utils/lang"
import { Callback, HashpipeFunction, Lambda, setLambdaRunner } from "./helpers"

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
    expr?: ExprNode
}

// A node in an infix expression tree: either a binary op or an operand
// (literal value, variable reference, or sub-pipe)
export interface ExprNode {
    op?: string
    left?: ExprNode
    right?: ExprNode
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
    alias(a: string, s: string | Lambda): void {
        if (this.parent != null) {
            this.parent.alias(a, s)
        } else if (s instanceof Lambda) {
            this.set("fns", a, aliasFn(s))
            this.set("aliases", a, s.src ?? String(s))
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
                if (!isFunction(fn)) {
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

        if (isString(fns)) {
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
                isObject(exportEntries[0][1])
            ) {
                registerNamespace(
                    namespace,
                    exportEntries[0][1] as Record<string, any>,
                )
            } else {
                registerNamespace(namespace, moduleExports)
            }
        } else if (isObject(fns)) {
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
    const cmd_tokens = cloneShallow(_cmd_tokens)
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

        const replaceArg = (arg: any, _cb: Callback) => {
            if (isObject(arg)) {
                if (arg instanceof Lambda) {
                    return _cb(null, arg)
                } else if (arg.fn != null) {
                    // Lambda token from the grammar: capture the current
                    // scope instead of evaluating the body
                    return _cb(
                        null,
                        new Lambda(
                            arg.fn as any[],
                            (arg.params as string[]) || [],
                            ctx,
                            arg.src as string | undefined,
                        ),
                    )
                } else if (arg.sub != null) {
                    return runPipelines(arg.sub as any[], inp, ctx, _cb)
                } else if (arg.quoted != null) {
                    return parseArgs(
                        inp,
                        arg.quoted as any[],
                        (err: Error | null, qargs?: any[]) => {
                            _cb(null, qargs?.join(" "))
                        },
                    )
                }
            } else if (isString(arg)) {
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
                    // Braced ${var} splices explicitly without eating a
                    // suffix: ${file}_v2 expands $file then appends _v2
                    let braced: RegExpMatchArray | null
                    while (
                        typeof arg === "string" &&
                        (braced = arg.match(/\$\{([!a-zA-Z0-9_-]+)\}/))
                    ) {
                        const key = braced[1]
                        const val = key === "!" ? inp : ctx.get("vars", key)
                        // A lone variable passes its value through with
                        // its type intact (objects stay objects)
                        if (arg === braced[0]) {
                            arg = val
                            break
                        }
                        arg = arg.replace(braced[0], () => String(val))
                    }
                    let $key: RegExpMatchArray | null
                    while (
                        typeof arg === "string" &&
                        ($key = arg.match(/\$[!a-zA-Z0-9_-]+/))
                    ) {
                        const key_str = $key[0]
                        let val: any
                        if (key_str === "$!") {
                            val = inp
                        } else {
                            const key = key_str.slice(1)
                            val = ctx.get("vars", key)
                        }
                        // A lone variable passes its value through with
                        // its type intact (objects stay objects)
                        if (arg === key_str) {
                            arg = val
                            break
                        }
                        // Function form so values containing $& and
                        // friends are inserted verbatim
                        arg = arg.replace(key_str, () => String(val))
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
            if (cmd_type === "||" || cmd_type === "|=") {
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
        // An |? stage catches the upstream error as its input; any other
        // error aborts the pipeline
        const routeError = (err: any) => {
            if (cmd_tokens[0]?.type === "|?") {
                return runPipeline(cmd_tokens, err, ctx, final_cb)
            }
            final_cb(err)
        }

        // Create a callback to continue the pipeline otherwise
        cb = (err: Error | null, ret?: any) => {
            if (err) return routeError(err)
            applyAt(ret, (err: Error | null, ret?: any) => {
                if (err) return routeError(err)
                // |? stages only run on error; skip them on success
                let next = cmd_tokens
                while (next.length && next[0].type === "|?") {
                    next = next.slice(1)
                }
                if (!next.length) return final_cb(null, ret)
                runPipeline(next, ret, ctx, final_cb)
            })
        }
    }

    // Run this stage (command or infix expression) against a single input
    const runStage = (_inp: any, _cb: Callback) => {
        if (cmd_token.expr != null) {
            evalExpr(cmd_token.expr, _inp, ctx, _cb)
        } else {
            parseArgs(_inp, cmd_args, (err: Error | null, args?: any[]) => {
                if (err) return _cb(err)
                doCmd(args!, _inp, ctx, _cb)
            })
        }
    }

    // Parse arguments and then execute

    // Return literal value (number, string, bool, null) if $val
    if ("val" in cmd_token) {
        if (DEBUG) console.log("VAL: " + _inspect(cmd_args))
        parseArgs(inp, [cmd_token.val], (err: Error | null, parsed?: any[]) => {
            if (err) return cb(err)
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
    // Otherwise look the pipe operator up in the registry
    else {
        if (DEBUG) console.log((cmd_type || "|") + ": " + _inspect(cmd_args))
        const handler = pipeHandlers[cmd_type || "|"]
        if (!handler) {
            return final_cb(`Unknown pipe operator ${cmd_type}. `)
        }
        handler(inp, ctx, runStage, cb)
    }
}

// Pipe operators are pluggable: each handler decides how a stage consumes
// its input. New operators (parsed generically by the grammar) can be
// registered at runtime without touching runPipeline.

export type PipeHandler = (
    inp: any,
    ctx: Scope,
    runStage: (inp: any, cb: Callback) => void,
    cb: Callback,
) => void

const pipeHandlers: Record<string, PipeHandler> = {
    // standard pipe: run the stage once with the piped input
    "|": (inp, ctx, run, cb) => run(inp, cb),
    // error pipe: only reached via error routing in runPipeline, where the
    // upstream error arrives as the input; skipped entirely on success
    "|?": (inp, ctx, run, cb) => run(inp, cb),
    // parallel pipe: map the stage over a list in parallel
    "||": (inp, ctx, run, cb) => {
        const tasks = (inp as any[]).map(
            (_inp) => (_cb: Callback) => run(_inp, _cb),
        )
        async.parallel(tasks, cb)
    },
    // series pipe: map the stage over a list one at a time
    "|=": (inp, ctx, run, cb) => {
        const tasks = (inp as any[]).map(
            (_inp) => (_cb: Callback) => run(_inp, _cb),
        )
        async.series(tasks, cb)
    },
}

export function registerPipeOperator(op: string, handler: PipeHandler): void {
    pipeHandlers[op] = handler
}

// Evaluate an infix expression tree: resolve operands (literals, variables,
// sub-pipes) against the current input and scope, then apply operators

function evalExpr(node: ExprNode, inp: any, ctx: Scope, cb: Callback): void {
    if (node.op != null) {
        evalExpr(node.left!, inp, ctx, (err: any, left?: any) => {
            if (err) return cb(err)
            evalExpr(node.right!, inp, ctx, (err: any, right?: any) => {
                if (err) return cb(err)
                cb(null, applyOp(node.op!, left, right))
            })
        })
    } else if (node.sub != null) {
        runPipelines(node.sub, inp, ctx, cb)
    } else if (node.var != null) {
        if (node.var === "$!") {
            cb(null, inp)
        } else {
            cb(null, ctx.get("vars", node.var.slice(1)))
        }
    } else if ("val" in node) {
        cb(null, node.val)
    } else {
        cb(`Bad expression operand: ${_inspect(node)}`)
    }
}

function applyOp(op: string, a: any, b: any): any {
    const num = (v: any) => Number(v) || 0
    switch (op) {
        case "+":
            return num(a) + num(b)
        case "-":
            return num(a) - num(b)
        case "*":
            return num(a) * num(b)
        case "/":
            return num(a) / num(b)
        case "%":
            return num(a) % num(b)
        case "==":
            return a === b || String(a) === String(b)
        case "!=":
            return !(a === b || String(a) === String(b))
        default: {
            // Ordered comparisons: numeric when both sides are numbers,
            // string comparison otherwise
            const an = Number(a)
            const bn = Number(b)
            const numeric = !isNaN(an) && !isNaN(bn)
            const x = numeric ? an : String(a)
            const y = numeric ? bn : String(b)
            if (op === "<") return x < y
            if (op === ">") return x > y
            if (op === "<=") return x <= y
            return x >= y
        }
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
    const args = cloneShallow(_args)
    const cmd = args.shift()

    // Commands report failure through the callback, but a buggy or
    // misused command can still throw synchronously (e.g. a string
    // builtin on undefined input). Convert that into a pipeline error
    // so the rest of the chain isn't left hanging.
    let called = false
    const done: Callback = (err, ret?) => {
        if (called) return
        called = true
        cb(err, ret)
    }
    const invoke = (run: () => void) => {
        try {
            run()
        } catch (e) {
            done(`Error in command ${cmd}: ${e}`)
        }
    }

    if (cmd instanceof Lambda) {
        return invoke(() => cmd.call(inp, args, done))
    }
    // Scope chain first, builtins as fallback: defs, aliases, and module
    // commands can shadow a builtin (the `builtin` command bypasses this)
    let fn = ctx.get("fns", cmd)
    if (fn) {
        const resolved = fn
        if (resolved instanceof Lambda) {
            invoke(() => resolved.call(inp, args, done))
        } else {
            invoke(() => resolved(inp, args, ctx, done))
        }
    } else if ((fn = builtins[cmd])) {
        const resolved = fn
        invoke(() => resolved(inp, args, ctx, done))
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
    const obj = cloneShallow(_obj)
    const expr = cloneShallow(_expr)

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
        runPipelines(step.sub as any[], obj, ctx, cb)
    }
    // Array result
    else if (Array.isArray(step.get)) {
        const tasks = (step.get as any[]).map((step_expr: any) => {
            return (_cb: Callback) => descendObj(obj, step_expr, ctx, _cb)
        })
        async.parallel(tasks, cb)
    }
    // Object result
    else if (isObject(step.get) && step.get.obj != null) {
        const tasks: Array<(cb: Callback) => void> = []
        for (const set of step.get.obj as any[]) {
            ;((set) => {
                const k = set.key
                const e = set.val

                if (isString(k)) {
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
    } else if (key === "*") {
        // Wildcard: all values of an object (or the items of an array)
        return Array.isArray(obj) ? obj.slice() : Object.values(obj)
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

// Token-based equivalent of `through` for aliases defined as lambdas:
// call-site args are appended to the first command and the body runs in
// the caller's scope, preserving classic alias semantics.
function aliasFn(lam: Lambda): HashpipeFunction {
    return (inp: any, args: any[], ctx: any, cb: Callback) => {
        const pipelines = lam.tokens.slice()
        const first = cloneShallow(pipelines[0])
        if (first[0]?.cmd != null) {
            first[0] = { ...first[0], cmd: [...first[0].cmd, ...args] }
        }
        pipelines[0] = first
        runPipelines(pipelines, inp, ctx, cb)
    }
}

// Lambda invocation runs pipelines but lives in helpers.ts to avoid a
// circular import; inject the runner here.
setLambdaRunner(runPipelines)

// Read in an at expression
export function at(
    inp: any,
    expr: AtExpression[],
    ctx: Scope,
    cb: Callback,
): void {
    descendObj(inp, expr, ctx, cb)
}
