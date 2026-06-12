"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
// State management and module loading helpers that mutate the scope.
const environmentBuiltins = {
    set: (inp, args, ctx, cb) => {
        const data = args[1] || inp;
        ctx.set("vars", args[0], data);
        cb(null, data);
    },
    setall: (inp, args, ctx, cb) => {
        const data = args[1] || inp;
        for (const [key, value] of Object.entries(data)) {
            ctx.set("vars", key, value);
        }
        cb(null, data);
    },
    inc: (inp, args, ctx, cb) => {
        const key = args[0];
        if (ctx[key] == null)
            ctx[key] = 0;
        cb(null, ++ctx[key]);
    },
    push: (inp, args, ctx, cb) => {
        const data = args[1] || inp;
        const list = ctx.get("vars", args[0]) || [];
        list.push(data);
        ctx.set("vars", args[0], list);
        cb(null, list);
    },
    ginc: (inp, args, ctx, cb) => {
        const groupKey = args[0];
        const objKey = args[1];
        if (ctx[groupKey] == null) {
            ctx[groupKey] = { val: 0, objs: {} };
        }
        if (ctx[groupKey].objs[objKey] != null) {
            cb(null, ctx[groupKey].objs[objKey]);
        }
        else {
            const value = ++ctx[groupKey].val;
            ctx[groupKey].objs[objKey] = value;
            cb(null, value);
        }
    },
    use: (inp, args, ctx, cb) => {
        const imported = [];
        const shadowed = [];
        const topScope = ctx.topScope();
        const pipeline = topScope;
        for (const entry of args) {
            pipeline.use(entry);
            if (typeof pipeline.getLastRegisteredFns === "function") {
                imported.push(...pipeline.getLastRegisteredFns());
            }
            if (typeof pipeline.getLastShadowedFns === "function") {
                shadowed.push(...pipeline.getLastShadowedFns());
            }
        }
        const unique = [...new Set(imported)];
        const messageItems = unique.length ? unique : args;
        let message = "Using: " + messageItems.join(", ");
        if (shadowed.length) {
            message += " (shadowing: " + [...new Set(shadowed)].join(", ") + ")";
        }
        cb(null, message);
    },
    def: (inp, args, ctx, cb) => {
        const name = args[0];
        const lam = args[1];
        if (!(lam instanceof helpers_1.Lambda)) {
            return cb(`def: second argument must be a lambda, e.g. def ${name} {| ... |}`);
        }
        ctx.topScope().set("fns", name, lam);
        cb(null, {
            success: true,
            def: name,
            src: lam.src,
        });
    },
    alias: (inp, args, ctx, cb) => {
        const alias = args[0];
        const script = args[1];
        if (!script) {
            cb(null, ctx.get("aliases", alias));
        }
        else {
            ctx.alias(alias, script);
            cb(null, {
                success: true,
                alias,
                script: script instanceof helpers_1.Lambda ? script.src : script,
            });
        }
    },
    aliases: (inp, args, ctx, cb) => {
        if (!inp) {
            cb(null, ctx.get("aliases"));
        }
        else {
            for (const [alias, script] of Object.entries(inp)) {
                ctx.alias(alias, script);
            }
            cb(null, {
                success: true,
                aliases: inp,
            });
        }
    },
};
exports.default = environmentBuiltins;
//# sourceMappingURL=environment.js.map