"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lambda = void 0;
exports.setLambdaRunner = setLambdaRunner;
exports.prettyPrint = prettyPrint;
exports.wrapone = wrapone;
exports.isPromiseLike = isPromiseLike;
exports.command = command;
exports.wraponeSync = wraponeSync;
exports.wrapall = wrapall;
const util_1 = require("util");
let lambdaRunner = null;
function setLambdaRunner(runner) {
    lambdaRunner = runner;
}
class Lambda {
    constructor(tokens, params, ctx, src) {
        this.tokens = tokens;
        this.params = params;
        this.ctx = ctx;
        this.src = src;
    }
    call(inp, args) {
        if (!lambdaRunner) {
            return Promise.reject("Lambda runner not initialized");
        }
        const scope = this.ctx && typeof this.ctx.subScope === "function"
            ? this.ctx.subScope({ vars: {} })
            : this.ctx;
        this.params.forEach((param, i) => {
            scope.set("vars", param, i < args.length ? args[i] : inp);
        });
        scope.set("vars", "args", args.slice(this.params.length));
        return lambdaRunner(this.tokens, inp, scope);
    }
    display() {
        return this.src ?? "{| ... }";
    }
    toString() {
        return this.display();
    }
    toJSON() {
        return this.display();
    }
    [util_1.inspect.custom]() {
        return this.display();
    }
}
exports.Lambda = Lambda;
function prettyPrint(o) {
    if (typeof o === "object") {
        return (0, util_1.inspect)(o, { depth: null, colors: true });
    }
    else {
        return String(o);
    }
}
function wrapone(f, with_inp = false) {
    return (inp, args) => {
        if (with_inp) {
            args.unshift(inp);
        }
        return f(...args);
    };
}
function isPromiseLike(value) {
    return value != null && typeof value.then === "function";
}
function command(fn) {
    return fn;
}
function wraponeSync(f, with_inp = false) {
    return command((inp, args) => {
        if (with_inp) {
            args.unshift(inp);
        }
        return f(...args);
    });
}
function wrapall(o, pre = "", with_inp = false, sync = false) {
    const wo = {};
    for (const [k, f] of Object.entries(o)) {
        if (typeof f === "function") {
            const wrapf = sync ? wraponeSync : wrapone;
            wo[pre + k] = wrapf(f, with_inp);
        }
    }
    return wo;
}
//# sourceMappingURL=helpers.js.map