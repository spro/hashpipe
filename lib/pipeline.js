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
const fs = __importStar(require("fs"));
const util_1 = require("util");
const lang_1 = require("./utils/lang");
const module_loader_1 = require("./module-loader");
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
        this.lastShadowedFns = [];
    }
    use(fns) {
        const markShadow = (name) => {
            if (this.get("fns", name) != null || builtins[name] != null) {
                shadowed.push(name);
            }
        };
        const registerNamespace = (namespace, funcs) => {
            for (const [exportName, fn] of Object.entries(funcs)) {
                if (!(0, lang_1.isFunction)(fn)) {
                    continue;
                }
                const commandName = `${namespace}.${exportName}`;
                markShadow(commandName);
                this.set("fns", commandName, fn);
                if (exportName === namespace) {
                    markShadow(namespace);
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
            // hashpipe-llm registers as llm, matching `use llm` via npm
            return leaf.replace(/\.[^.]+$/, "").replace(/^hashpipe-/, "");
        };
        let registered = [];
        const shadowed = [];
        if ((0, lang_1.isString)(fns)) {
            const request = fns;
            const namespace = normalizeNamespace(request);
            const moduleExports = (0, module_loader_1.loadModule)(request).exports;
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
                markShadow(k);
                this.set("fns", k, v);
                registered.push(k);
            }
        }
        this.lastRegisteredFns = registered;
        this.lastShadowedFns = shadowed;
        return this;
    }
    getLastRegisteredFns() {
        return this.lastRegisteredFns.slice();
    }
    getLastShadowedFns() {
        return this.lastShadowedFns.slice();
    }
    // Execute a pipeline given a command string, optional input object,
    // and optional context. An empty child context is created if none is given.
    async exec(script, inp = null, ctx) {
        const runCtx = ctx ?? this.subScope();
        try {
            const pipelines = parsePipelines(script);
            return await runPipelines(pipelines, inp, runCtx);
        }
        catch (e) {
            throw "Error parsing pipeline: " + e;
        }
    }
    async execFile(script_filename, inp, ctx) {
        const script = fs.readFileSync(script_filename).toString();
        return this.exec(script, inp, ctx);
    }
}
exports.Pipeline = Pipeline;
// Parse a command pipeline into a series of tokens
// that can be passed to `runPipeline`
function parsePipelines(cmd) {
    return grammar.parse(cmd);
}
// Execute a parsed command pipeline, recursively passing each stage's
// result into the next stage.
//        /~+~+~+~+~+~+~+~+~+~+~+~+~+\
//       |  PROCEED AT YOUR OWN RISK  |
//       |       dragons afoot        |
//        \+~+~+~+~+~+~+~+~+~+~+~+~+~/
async function runPipelines(pipelines, inp, ctx) {
    let result;
    for (const pipeline of pipelines) {
        result = await runPipeline(pipeline, inp, ctx);
    }
    return result;
}
async function runPipeline(_cmd_tokens, inp, ctx) {
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
    const parseArgs = async (inp, args) => {
        if (DEBUG) {
            console.log("parsing args for " + _inspect(inp));
            console.log(":::> " + _inspect(args));
        }
        const replaceArg = async (arg) => {
            if ((0, lang_1.isObject)(arg)) {
                if (arg instanceof helpers_1.Lambda) {
                    return arg;
                }
                else if (arg.fn != null) {
                    // Lambda token from the grammar: capture the current
                    // scope instead of evaluating the body
                    return new helpers_1.Lambda(arg.fn, arg.params || [], ctx, arg.src);
                }
                else if (arg.sub != null) {
                    return runPipelines(arg.sub, inp, ctx);
                }
                else if (arg.quoted != null) {
                    const qargs = await parseArgs(inp, arg.quoted);
                    return qargs.join(" ");
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
                    // Braced ${var} splices explicitly without eating a
                    // suffix: ${file}_v2 expands $file then appends _v2
                    let braced;
                    while (typeof arg === "string" &&
                        (braced = arg.match(/\$\{([!a-zA-Z0-9_-]+)\}/))) {
                        const key = braced[1];
                        const val = key === "!" ? inp : ctx.get("vars", key);
                        // A lone variable passes its value through with
                        // its type intact (objects stay objects)
                        if (arg === braced[0]) {
                            arg = val;
                            break;
                        }
                        arg = arg.replace(braced[0], () => String(val));
                    }
                    let $key;
                    while (typeof arg === "string" &&
                        ($key = arg.match(/\$[!a-zA-Z0-9_-]+/))) {
                        const key_str = $key[0];
                        let val;
                        if (key_str === "$!") {
                            val = inp;
                        }
                        else {
                            const key = key_str.slice(1);
                            val = ctx.get("vars", key);
                        }
                        // A lone variable passes its value through with
                        // its type intact (objects stay objects)
                        if (arg === key_str) {
                            arg = val;
                            break;
                        }
                        // Function form so values containing $& and
                        // friends are inserted verbatim
                        arg = arg.replace(key_str, () => String(val));
                    }
                }
            }
            return arg;
        };
        return Promise.all(args.map(replaceArg));
    };
    // Apply an at expression at the end
    const applyAt = async (data) => {
        if (cmd_token.at != null) {
            if (cmd_type === "||" || cmd_type === "|=") {
                return Promise.all(data.map((_data) => at(_data, cmd_token.at, ctx)));
            }
            return at(data, cmd_token.at, ctx);
        }
        return data;
    };
    const continuePipeline = async (ret) => {
        const applied = await applyAt(ret);
        if (!cmd_tokens.length) {
            if (DEBUG)
                console.log(" ===> " + _inspect(applied));
            return applied;
        }
        // |? stages only run on error; skip them on success
        let next = cmd_tokens;
        while (next.length && next[0].type === "|?") {
            next = next.slice(1);
        }
        if (!next.length)
            return applied;
        return runPipeline(next, applied, ctx);
    };
    const routeError = async (err) => {
        if (cmd_tokens[0]?.type === "|?") {
            return runPipeline(cmd_tokens, err, ctx);
        }
        throw err;
    };
    // Run this stage (command or infix expression) against a single input
    const runStage = async (_inp) => {
        if (cmd_token.expr != null) {
            return evalExpr(cmd_token.expr, _inp, ctx);
        }
        const args = await parseArgs(_inp, cmd_args);
        return doCmd(args, _inp, ctx);
    };
    // Parse arguments and then execute
    // Return literal value (number, string, bool, null) if $val
    if ("val" in cmd_token) {
        if (DEBUG)
            console.log("VAL: " + _inspect(cmd_args));
        try {
            const parsed = await parseArgs(inp, [cmd_token.val]);
            return continuePipeline(parsed[0]);
        }
        catch (err) {
            return routeError(err);
        }
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
        return continuePipeline(val);
    }
    // Otherwise look the pipe operator up in the registry
    else {
        if (DEBUG)
            console.log((cmd_type || "|") + ": " + _inspect(cmd_args));
        const handler = pipeHandlers[cmd_type || "|"];
        if (!handler) {
            throw `Unknown pipe operator ${cmd_type}. `;
        }
        try {
            const ret = await handler(inp, ctx, runStage);
            return continuePipeline(ret);
        }
        catch (err) {
            return routeError(err);
        }
    }
}
const pipeHandlers = {
    // standard pipe: run the stage once with the piped input
    "|": (inp, ctx, run) => run(inp),
    // error pipe: only reached via error routing in runPipeline, where the
    // upstream error arrives as the input; skipped entirely on success
    "|?": (inp, ctx, run) => run(inp),
    // parallel pipe: map the stage over a list in parallel
    "||": (inp, ctx, run) => Promise.all(inp.map(run)),
    // series pipe: map the stage over a list one at a time
    "|=": async (inp, ctx, run) => {
        const results = [];
        for (const item of inp) {
            results.push(await run(item));
        }
        return results;
    },
};
function registerPipeOperator(op, handler) {
    pipeHandlers[op] = handler;
}
// Evaluate an infix expression tree: resolve operands (literals, variables,
// sub-pipes) against the current input and scope, then apply operators
async function evalExpr(node, inp, ctx) {
    if (node.op != null) {
        const left = await evalExpr(node.left, inp, ctx);
        const right = await evalExpr(node.right, inp, ctx);
        return applyOp(node.op, left, right);
    }
    else if (node.sub != null) {
        return runPipelines(node.sub, inp, ctx);
    }
    else if (node.var != null) {
        if (node.var === "$!") {
            return inp;
        }
        return ctx.get("vars", node.var.slice(1));
    }
    else if ("val" in node) {
        return node.val;
    }
    throw `Bad expression operand: ${_inspect(node)}`;
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
async function doCmd(_args, inp, ctx) {
    if (DEBUG) {
        console.log("\n##### DO CMD ######");
        inspect(_args);
        inspect(inp);
        console.log("###################\n");
    }
    const args = (0, lang_1.cloneShallow)(_args);
    const cmd = args.shift();
    const invoke = async (run) => {
        try {
            return await run();
        }
        catch (e) {
            throw `Error in command ${cmd}: ${e}`;
        }
    };
    if (cmd instanceof helpers_1.Lambda) {
        return invoke(() => cmd.call(inp, args));
    }
    // Scope chain first, builtins as fallback: defs, aliases, and module
    // commands can shadow a builtin (the `builtin` command bypasses this)
    let fn = ctx.get("fns", cmd);
    if (fn) {
        const resolved = fn;
        if (resolved instanceof helpers_1.Lambda) {
            return invoke(() => resolved.call(inp, args));
        }
        return invoke(() => resolved(inp, args, ctx));
    }
    else if ((fn = builtins[cmd])) {
        const resolved = fn;
        return invoke(() => resolved(inp, args, ctx));
    }
    throw `No command ${cmd}. `;
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
async function mapInto(l, f, d) {
    if (d === 1) {
        return Promise.all(l.map(f));
    }
    return Promise.all(l.map((_l) => mapInto(_l, f, d - 1)));
}
//   , \-._ >._,_     _,_.< _.-/
//   (   )  \(-='(     )`--)/  (   _
//    `\-\_/-')\/'     `\/(`-\_/-/' `
//     <`)_--(_\_       _/_)--_('>
// Take an object and an expression and follow the expression
// tree down to the desired result
async function descendObj(_obj, _expr, ctx) {
    if (_obj == null) {
        return undefined;
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
    const finish = async (ret) => expr.length === 0 ? ret : descendObj(ret, expr, ctx);
    if (step == null) {
        return finish(obj);
    }
    // Map attributes
    if (step.map != null) {
        const map_get = (__obj) => descendObj(__obj, [{ get: step.map }], ctx);
        return finish(await mapInto(obj, map_get, step.depth));
    }
    // Substitution
    else if (step.sub != null) {
        return finish(await runPipelines(step.sub, obj, ctx));
    }
    // Array result
    else if (Array.isArray(step.get)) {
        const result = await Promise.all(step.get.map((step_expr) => step_expr?.var != null
            ? resolveTemplateVar(step_expr, obj, ctx)
            : descendObj(obj, step_expr, ctx)));
        return finish(result);
    }
    // Object result
    else if ((0, lang_1.isObject)(step.get) && step.get.obj != null) {
        const results = await Promise.all(step.get.obj.map(async (set) => {
            const key = (0, lang_1.isString)(set.key)
                ? set.key
                : await descendObj(obj, set.key, ctx);
            const value = set.val.sub != null
                ? await runPipelines(set.val.sub, obj, ctx)
                : set.val.var != null
                    ? await resolveTemplateVar(set.val, obj, ctx)
                    : await descendObj(obj, set.val, ctx);
            return { key, val: value };
        }));
        const result_obj = {};
        for (const result of results) {
            result_obj[result.key] = result.val;
        }
        return finish(result_obj);
    }
    // Get attribute
    else {
        return finish(accessor(obj, step.get));
    }
}
// A $var template value: resolve from scope ($! is the object being
// reshaped), then follow any trailing path ($where.city)
async function resolveTemplateVar(tok, obj, ctx) {
    const base = tok.var === "$!" ? obj : ctx.get("vars", tok.var.slice(1));
    if (tok.path && tok.path.length) {
        return descendObj(base, tok.path, ctx);
    }
    return base;
}
function isSliceAccessor(key) {
    return (0, lang_1.isObject)(key) && key.slice != null;
}
function accessor(obj, key) {
    if (key === ".") {
        return obj;
    }
    else if (key === "*") {
        // Wildcard: all values of an object (or the items of an array)
        return Array.isArray(obj) ? obj.slice() : Object.values(obj);
    }
    else if (isSliceAccessor(key)) {
        if (obj == null || typeof obj.slice !== "function") {
            return [];
        }
        const { start, end } = key.slice;
        return obj.slice(start ?? undefined, end ?? undefined);
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
    return (inp, args, ctx) => {
        const pipeline = parsePipelines(cmd)[0];
        if (pipeline[0].cmd != null) {
            pipeline[0].cmd.push(...args);
        }
        return runPipeline(pipeline, inp, ctx);
    };
}
// Token-based equivalent of `through` for aliases defined as lambdas:
// call-site args are appended to the first command and the body runs in
// the caller's scope, preserving classic alias semantics.
function aliasFn(lam) {
    return (inp, args, ctx) => {
        const pipelines = lam.tokens.slice();
        const first = (0, lang_1.cloneShallow)(pipelines[0]);
        if (first[0]?.cmd != null) {
            first[0] = { ...first[0], cmd: [...first[0].cmd, ...args] };
        }
        pipelines[0] = first;
        return runPipelines(pipelines, inp, ctx);
    };
}
// Lambda invocation runs pipelines but lives in helpers.ts to avoid a
// circular import; inject the runner here.
(0, helpers_1.setLambdaRunner)(runPipelines);
// Read in an at expression
function at(inp, expr, ctx) {
    return descendObj(inp, expr, ctx);
}
//# sourceMappingURL=pipeline.js.map