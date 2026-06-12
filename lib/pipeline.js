"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pipeline = exports.Context = exports.Scope = void 0;
exports.parsePipelines = parsePipelines;
exports.runPipeline = runPipeline;
exports.registerPipeOperator = registerPipeOperator;
exports.doCmd = doCmd;
exports.at = at;
const grammar = require("./grammar");
const builtins = __importStar(require("./builtins"));
const async = __importStar(require("async"));
const fs = __importStar(require("fs"));
const util_1 = require("util");
const lang_1 = require("./utils/lang");
const helpers_1 = require("./helpers");
const DEBUG = false;
// Utility functions
const recv_ = (t, s) => console.log(`[${t.toUpperCase()}] ${s}`);
const _inspect = (o) => (0, util_1.inspect)(o, { depth: null });
const inspect = (o) => console.log(_inspect(o));
// Create a context that can be extended with `.use`
class Scope {
    constructor(init = {}) {
        Object.assign(this, init);
    }
    // Set a value on the current scope
    set(t, k, v) {
        if (DEBUG) {
            console.log(`[Scope set] Setting ${t} ${k} to ${v}`);
        }
        if (this[t] == null)
            this[t] = {};
        this[t][k] = v;
        return this;
    }
    // Get a value from the current scope, falling back to parent scope
    get(t, k) {
        if (DEBUG) {
            console.log(`[Scope get] Getting ${t} ${k}`);
        }
        let got;
        if (k != null) {
            got = this[t]?.[k];
        }
        else {
            got = this[t];
        }
        return got || this.parent?.get(t, k);
    }
    // Set an alias on the highest ranking scope
    alias(a, s) {
        if (this.parent != null) {
            this.parent.alias(a, s);
        }
        else if (s instanceof helpers_1.Lambda) {
            this.set("fns", a, aliasFn(s));
            this.set("aliases", a, s.src ?? String(s));
        }
        else {
            this.set("fns", a, through(s));
            this.set("aliases", a, s);
        }
    }
    // Create a new child scope for this scope
    subScope(init = {}) {
        init.parent = this;
        return new Scope(init);
    }
    topScope() {
        if (this.parent != null) {
            return this.parent.topScope();
        }
        else {
            return this;
        }
    }
}
exports.Scope = Scope;
class Context extends Scope {
}
exports.Context = Context;
class Pipeline extends Scope {
    constructor() {
        super(...arguments);
        this.lastRegisteredFns = [];
    }
    use(fns) {
        const registerNamespace = (namespace, funcs) => {
            for (const [exportName, fn] of Object.entries(funcs)) {
                if (!(0, lang_1.isFunction)(fn)) {
                    continue;
                }
                const commandName = `${namespace}.${exportName}`;
                this.set("fns", commandName, fn);
                if (exportName === namespace) {
                    this.set("fns", namespace, fn);
                    registered.push(namespace);
                }
                else {
                    registered.push(commandName);
                }
            }
        };
        const normalizeNamespace = (raw) => {
            const sanitized = raw.replace(/[\\/]+/g, "/");
            const segments = sanitized.split("/").filter(Boolean);
            const leaf = segments.length ? segments[segments.length - 1] : raw;
            return leaf.replace(/\.[^.]+$/, "");
        };
        let registered = [];
        if ((0, lang_1.isString)(fns)) {
            const request = fns;
            let moduleName = request;
            if (moduleName.match(/^\w/)) {
                moduleName = "./modules/" + moduleName;
            }
            const namespace = normalizeNamespace(request);
            const moduleExports = require(moduleName);
            const exportEntries = Object.entries(moduleExports);
            if (exportEntries.length === 1 &&
                exportEntries[0][0] === "default" &&
                (0, lang_1.isObject)(exportEntries[0][1])) {
                registerNamespace(namespace, exportEntries[0][1]);
            }
            else {
                registerNamespace(namespace, moduleExports);
            }
        }
        else if ((0, lang_1.isObject)(fns)) {
            for (const [k, v] of Object.entries(fns)) {
                this.set("fns", k, v);
                registered.push(k);
            }
        }
        this.lastRegisteredFns = registered;
        return this;
    }
    getLastRegisteredFns() {
        return this.lastRegisteredFns.slice();
    }
    // Execute a pipeline given a command string, input object,
    // context and callback. An empty context object is created
    // if none is given.
    // exec(script, cb)
    // exec(script, inp, cb)
    // exec(script, inp, ctx, cb)
    exec(script, inp, ctx, cb) {
        // Handle overloaded signatures
        if (cb == null) {
            cb = ctx;
            ctx = this.subScope();
        }
        if (cb == null) {
            cb = inp;
            inp = null;
        }
        try {
            const pipelines = parsePipelines(script);
            try {
                runPipelines(pipelines, inp, ctx, cb);
            }
            catch (e) {
                cb("Error executing pipeline: " + e);
            }
        }
        catch (e) {
            cb("Error parsing pipeline: " + e);
        }
        return ctx;
    }
    execFile(script_filename, inp, ctx, cb) {
        const script = fs.readFileSync(script_filename).toString();
        this.exec(script, inp, ctx, cb);
    }
}
exports.Pipeline = Pipeline;
// Parse a command pipeline into a series of tokens
// that can be passed to `runPipeline`
function parsePipelines(cmd) {
    return grammar.parse(cmd);
}
// Execute a parsed command pipeline, executing each part
// recursively by setting a callback that is either the next
// command in line or a final "stdout" callback
//        /~+~+~+~+~+~+~+~+~+~+~+~+~+\
//       |  PROCEED AT YOUR OWN RISK  |
//       |       dragons afoot        |
//        \+~+~+~+~+~+~+~+~+~+~+~+~+~/
function runPipelines(pipelines, inp, ctx, cb) {
    if (pipelines.length > 1) {
        const _runPipeline = (_pipeline, _cb) => {
            runPipeline(_pipeline, inp, ctx, _cb);
        };
        async.mapSeries(pipelines, _runPipeline, (err, results) => {
            cb(err, results?.slice(-1)[0]);
        });
    }
    else {
        runPipeline(pipelines[0], inp, ctx, cb);
    }
}
function runPipeline(_cmd_tokens, inp, ctx, final_cb) {
    if (DEBUG) {
        console.log("\n=== RUNNING PIPELINE ===");
        inspect(inp);
        console.log(" ---> ");
        inspect(_cmd_tokens);
        console.log("========================\n");
    }
    const cmd_tokens = (0, lang_1.cloneShallow)(_cmd_tokens);
    const cmd_token = cmd_tokens.shift();
    let cmd_args = cmd_token.cmd;
    const cmd_type = cmd_token.type;
    if (!cmd_args)
        cmd_args = ["id"];
    // Replace sub-commands and variables
    const parseArgs = (inp, args, cb) => {
        if (DEBUG) {
            console.log("parsing args for " + _inspect(inp));
            console.log(":::> " + _inspect(args));
        }
        const replaceArg = (arg, _cb) => {
            if ((0, lang_1.isObject)(arg)) {
                if (arg instanceof helpers_1.Lambda) {
                    return _cb(null, arg);
                }
                else if (arg.fn != null) {
                    // Lambda token from the grammar: capture the current
                    // scope instead of evaluating the body
                    return _cb(null, new helpers_1.Lambda(arg.fn, arg.params || [], ctx, arg.src));
                }
                else if (arg.sub != null) {
                    return runPipelines(arg.sub, inp, ctx, _cb);
                }
                else if (arg.quoted != null) {
                    return parseArgs(inp, arg.quoted, (err, qargs) => {
                        _cb(null, qargs?.join(" "));
                    });
                }
            }
            else if ((0, lang_1.isString)(arg)) {
                // Int replacement
                const intMatch = arg.match(/^-?[0-9]+$/);
                if (intMatch) {
                    arg = parseInt(arg);
                }
                // Non replacement (escaped)
                else if (arg.match(/\\\$[a-zA-Z0-9_-]*$/)) {
                    arg = arg.slice(1);
                }
                // Within string replacement
                else {
                    let $key;
                    while (($key = arg.match(/\$[!a-zA-Z0-9_-]+/))) {
                        const key_str = $key[0];
                        let val;
                        if (key_str === "$!") {
                            val = inp;
                        }
                        else {
                            const key = key_str.slice(1);
                            val = ctx.get("vars", key);
                        }
                        // A lone $var holding a function value passes
                        // through intact rather than stringifying
                        if (arg === key_str && val instanceof helpers_1.Lambda) {
                            arg = val;
                            break;
                        }
                        arg = arg.replace(key_str, val);
                    }
                }
            }
            _cb(null, arg);
        };
        async.map(args, replaceArg, (err, new_args) => {
            cb(null, new_args);
        });
    };
    // Apply an at expression at the end
    const applyAt = (data, cb) => {
        if (cmd_token.at != null) {
            if (cmd_type === "||" || cmd_type === "|=") {
                const _at = (_data, _cb) => {
                    at(_data, cmd_token.at, ctx, _cb);
                };
                async.map(data, _at, cb);
            }
            else {
                at(data, cmd_token.at, ctx, cb);
            }
        }
        else {
            cb(null, data);
        }
    };
    // Check if we're at the final step
    let cb;
    if (cmd_tokens.length === 0) {
        cb = (err, ret) => {
            if (DEBUG) {
                console.log(" ===> " + _inspect(ret));
            }
            if (err) {
                final_cb(err);
            }
            else {
                applyAt(ret, final_cb);
            }
        };
    }
    else {
        // An |? stage catches the upstream error as its input; any other
        // error aborts the pipeline
        const routeError = (err) => {
            if (cmd_tokens[0]?.type === "|?") {
                return runPipeline(cmd_tokens, err, ctx, final_cb);
            }
            final_cb(err);
        };
        // Create a callback to continue the pipeline otherwise
        cb = (err, ret) => {
            if (err)
                return routeError(err);
            applyAt(ret, (err, ret) => {
                if (err)
                    return routeError(err);
                // |? stages only run on error; skip them on success
                let next = cmd_tokens;
                while (next.length && next[0].type === "|?") {
                    next = next.slice(1);
                }
                if (!next.length)
                    return final_cb(null, ret);
                runPipeline(next, ret, ctx, final_cb);
            });
        };
    }
    // Run this stage (command or infix expression) against a single input
    const runStage = (_inp, _cb) => {
        if (cmd_token.expr != null) {
            evalExpr(cmd_token.expr, _inp, ctx, _cb);
        }
        else {
            parseArgs(_inp, cmd_args, (err, args) => {
                if (err)
                    return _cb(err);
                doCmd(args, _inp, ctx, _cb);
            });
        }
    };
    // Parse arguments and then execute
    // Return literal value (number or string) if $val
    if (cmd_token.val != null) {
        if (DEBUG)
            console.log("VAL: " + _inspect(cmd_args));
        parseArgs(inp, [cmd_token.val], (err, parsed) => {
            if (err)
                return cb(err);
            cb(null, parsed[0]);
        });
    }
    // Return variable value if $var
    else if (cmd_token.var != null) {
        if (DEBUG)
            console.log("VAR: " + _inspect(cmd_args));
        const $key = cmd_token.var;
        let val;
        if ($key === "$!") {
            val = inp;
        }
        else {
            const key = $key.slice(1);
            val = ctx.get("vars", key);
        }
        cb(null, val);
    }
    // Otherwise look the pipe operator up in the registry
    else {
        if (DEBUG)
            console.log((cmd_type || "|") + ": " + _inspect(cmd_args));
        const handler = pipeHandlers[cmd_type || "|"];
        if (!handler) {
            return final_cb(`Unknown pipe operator ${cmd_type}. `);
        }
        handler(inp, ctx, runStage, cb);
    }
}
const pipeHandlers = {
    // standard pipe: run the stage once with the piped input
    "|": (inp, ctx, run, cb) => run(inp, cb),
    // error pipe: only reached via error routing in runPipeline, where the
    // upstream error arrives as the input; skipped entirely on success
    "|?": (inp, ctx, run, cb) => run(inp, cb),
    // parallel pipe: map the stage over a list in parallel
    "||": (inp, ctx, run, cb) => {
        const tasks = inp.map((_inp) => (_cb) => run(_inp, _cb));
        async.parallel(tasks, cb);
    },
    // series pipe: map the stage over a list one at a time
    "|=": (inp, ctx, run, cb) => {
        const tasks = inp.map((_inp) => (_cb) => run(_inp, _cb));
        async.series(tasks, cb);
    },
};
function registerPipeOperator(op, handler) {
    pipeHandlers[op] = handler;
}
// Evaluate an infix expression tree: resolve operands (literals, variables,
// sub-pipes) against the current input and scope, then apply operators
function evalExpr(node, inp, ctx, cb) {
    if (node.op != null) {
        evalExpr(node.left, inp, ctx, (err, left) => {
            if (err)
                return cb(err);
            evalExpr(node.right, inp, ctx, (err, right) => {
                if (err)
                    return cb(err);
                cb(null, applyOp(node.op, left, right));
            });
        });
    }
    else if (node.sub != null) {
        runPipelines(node.sub, inp, ctx, cb);
    }
    else if (node.var != null) {
        if (node.var === "$!") {
            cb(null, inp);
        }
        else {
            cb(null, ctx.get("vars", node.var.slice(1)));
        }
    }
    else if ("val" in node) {
        cb(null, node.val);
    }
    else {
        cb(`Bad expression operand: ${_inspect(node)}`);
    }
}
function applyOp(op, a, b) {
    const num = (v) => Number(v) || 0;
    switch (op) {
        case "+":
            return num(a) + num(b);
        case "-":
            return num(a) - num(b);
        case "*":
            return num(a) * num(b);
        case "/":
            return num(a) / num(b);
        case "%":
            return num(a) % num(b);
        case "==":
            return a === b || String(a) === String(b);
        case "!=":
            return !(a === b || String(a) === String(b));
        default: {
            // Ordered comparisons: numeric when both sides are numbers,
            // string comparison otherwise
            const an = Number(a);
            const bn = Number(b);
            const numeric = !isNaN(an) && !isNaN(bn);
            const x = numeric ? an : String(a);
            const y = numeric ? bn : String(b);
            if (op === "<")
                return x < y;
            if (op === ">")
                return x > y;
            if (op === "<=")
                return x <= y;
            return x >= y;
        }
    }
}
// Execute a given command by looking in `ctx.fns` for a function
// called `[cmd]` and passing that function the split arguments
function doCmd(_args, inp, ctx, cb) {
    if (DEBUG) {
        console.log("\n##### DO CMD ######");
        inspect(_args);
        inspect(inp);
        console.log("###################\n");
    }
    const args = (0, lang_1.cloneShallow)(_args);
    const cmd = args.shift();
    // Commands report failure through the callback, but a buggy or
    // misused command can still throw synchronously (e.g. a string
    // builtin on undefined input). Convert that into a pipeline error
    // so the rest of the chain isn't left hanging.
    let called = false;
    const done = (err, ret) => {
        if (called)
            return;
        called = true;
        cb(err, ret);
    };
    const invoke = (run) => {
        try {
            run();
        }
        catch (e) {
            done(`Error in command ${cmd}: ${e}`);
        }
    };
    if (cmd instanceof helpers_1.Lambda) {
        return invoke(() => cmd.call(inp, args, done));
    }
    // Scope chain first, builtins as fallback: defs, aliases, and module
    // commands can shadow a builtin (the `builtin` command bypasses this)
    let fn = ctx.get("fns", cmd);
    if (fn) {
        const resolved = fn;
        if (resolved instanceof helpers_1.Lambda) {
            invoke(() => resolved.call(inp, args, done));
        }
        else {
            invoke(() => resolved(inp, args, ctx, done));
        }
    }
    else if ((fn = builtins[cmd])) {
        const resolved = fn;
        invoke(() => resolved(inp, args, ctx, done));
    }
    else {
        cb(`No command ${cmd}. `);
    }
}
// Splits a string into "arguments" by separating with whitespace
// while attempting to treat quoted strings as single arguments.
// TODO: Make a more robust grammar that can handle escaping, etc.
function splitArgs(s) {
    const args = [];
    s.trim().replace(/"([^"]*)"|'([^']*)'|(\S+)/g, (g0, g1, g2, g3) => {
        args.push(g1 || g2 || g3 || "");
        return g0;
    });
    return args;
}
// Map a function into array of arrays at a certain depth
function mapInto(l, f, d, cb) {
    if (d === 1) {
        async.map(l, f, cb);
    }
    else {
        const _into = (_l, _cb) => mapInto(_l, f, d - 1, _cb);
        async.map(l, _into, cb);
    }
}
//   , \-._ >._,_     _,_.< _.-/
//   (   )  \(-='(     )`--)/  (   _
//    `\-\_/-')\/'     `\/(`-\_/-/' `
//     <`)_--(_\_       _/_)--_('>
// Take an object and an expression and follow the expression
// tree down to the desired result
function descendObj(_obj, _expr, ctx, final_cb) {
    if (_obj == null) {
        return final_cb(null, undefined);
    }
    // This is me hoping Node has really good GC
    const obj = (0, lang_1.cloneShallow)(_obj);
    const expr = (0, lang_1.cloneShallow)(_expr);
    const step = expr.shift();
    if (DEBUG) {
        console.log("\n/ - - ~ @ ~ - - \\");
        inspect(obj);
        console.log("      == @ ==> ");
        inspect(step);
        console.log("\\ - - ~ @ ~ - - /\n");
    }
    // Check if we're at the final step
    let cb;
    if (expr.length === 0) {
        cb = final_cb;
    }
    else {
        cb = (err, ret) => {
            descendObj(ret, expr, ctx, final_cb);
        };
    }
    if (step == null) {
        cb(null, obj);
        return;
    }
    // Map attributes
    if (step.map != null) {
        const map_get = (__obj, _cb) => {
            descendObj(__obj, [{ get: step.map }], ctx, _cb);
        };
        mapInto(obj, map_get, step.depth, cb);
    }
    // Substitution
    else if (step.sub != null) {
        runPipelines(step.sub, obj, ctx, cb);
    }
    // Array result
    else if (Array.isArray(step.get)) {
        const tasks = step.get.map((step_expr) => {
            return (_cb) => descendObj(obj, step_expr, ctx, _cb);
        });
        async.parallel(tasks, cb);
    }
    // Object result
    else if ((0, lang_1.isObject)(step.get) && step.get.obj != null) {
        const tasks = [];
        for (const set of step.get.obj) {
            ;
            ((set) => {
                const k = set.key;
                const e = set.val;
                if ((0, lang_1.isString)(k)) {
                    // Key is a string, just get value
                    tasks.push((_cb) => {
                        // Check if value is a sub-command or an at-expression
                        if (e.sub != null) {
                            runPipelines(e.sub, obj, ctx, (err, v_obj) => {
                                const dobj = {
                                    key: k,
                                    val: v_obj,
                                };
                                _cb(null, dobj);
                            });
                        }
                        else {
                            descendObj(obj, e, ctx, (err, v_obj) => {
                                const dobj = {
                                    key: k,
                                    val: v_obj,
                                };
                                _cb(null, dobj);
                            });
                        }
                    });
                }
                else {
                    // Key is an expression, get both key value and value value
                    tasks.push((_cb) => {
                        descendObj(obj, k, ctx, (err, k_obj) => {
                            // Check if value is a sub-command or an at-expression
                            if (e.sub != null) {
                                runPipelines(e.sub, obj, ctx, (err, v_obj) => {
                                    const dobj = {
                                        key: k_obj,
                                        val: v_obj,
                                    };
                                    _cb(null, dobj);
                                });
                            }
                            else {
                                descendObj(obj, e, ctx, (err, v_obj) => {
                                    const dobj = {
                                        key: k_obj,
                                        val: v_obj,
                                    };
                                    _cb(null, dobj);
                                });
                            }
                        });
                    });
                }
            })(set);
        }
        // Combine results into single object
        async.parallel(tasks, (err, results) => {
            const result_obj = {};
            for (const result of results) {
                result_obj[result.key] = result.val;
            }
            cb(null, result_obj);
        });
    }
    // Get attribute
    else {
        cb(null, accessor(obj, step.get));
    }
}
function accessor(obj, key) {
    if (key === ".") {
        return obj;
    }
    else {
        if (key.match(/^-?\d+/)) {
            let numKey = Number(key);
            // Pythonesque negative indexes
            if (numKey < 0) {
                return obj.slice(numKey)[0];
            }
            return obj[numKey];
        }
        return obj[key];
    }
}
// create a command out of a script
function through(cmd) {
    return (inp, args, ctx, cb) => {
        const pipeline = parsePipelines(cmd)[0];
        if (pipeline[0].cmd != null) {
            pipeline[0].cmd.push(...args);
        }
        runPipeline(pipeline, inp, ctx, cb);
    };
}
// Token-based equivalent of `through` for aliases defined as lambdas:
// call-site args are appended to the first command and the body runs in
// the caller's scope, preserving classic alias semantics.
function aliasFn(lam) {
    return (inp, args, ctx, cb) => {
        const pipelines = lam.tokens.slice();
        const first = (0, lang_1.cloneShallow)(pipelines[0]);
        if (first[0]?.cmd != null) {
            first[0] = { ...first[0], cmd: [...first[0].cmd, ...args] };
        }
        pipelines[0] = first;
        runPipelines(pipelines, inp, ctx, cb);
    };
}
// Lambda invocation runs pipelines but lives in helpers.ts to avoid a
// circular import; inject the runner here.
(0, helpers_1.setLambdaRunner)(runPipelines);
// Read in an at expression
function at(inp, expr, ctx, cb) {
    descendObj(inp, expr, ctx, cb);
}
//# sourceMappingURL=pipeline.js.map