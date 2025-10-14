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
const _ = __importStar(require("underscore"));
const util_1 = require("util");
const helpers = __importStar(require("./helpers"));
const _inspect = (o) => (0, util_1.inspect)(o, { depth: null });
const builtins = {};
// Command helpers
function valid(i) {
    if (_.isArray(i)) {
        return i.length > 0;
    }
    if (_.isObject(i)) {
        return _.keys(i).length > 0;
    }
    if (_.isString(i)) {
        return i.length > 0;
    }
    return i != null;
}
function combine(inp, args) {
    return _.flatten([inp].concat(args)).filter(valid);
}
// Arithmetic
function num(n) {
    return Number(n) || 0;
}
builtins.num = (inp, args, ctx, cb) => cb(null, num(inp || args[0]));
function bool(v) {
    if (_.isString(v)) {
        if (v === "false")
            return false;
        if (v === "true")
            return true;
    }
    return !!v;
}
builtins.bool = (inp, args, ctx, cb) => cb(null, bool(inp || args[0]));
function reducer(f) {
    return (inp, args, ctx, cb) => {
        cb(null, combine(inp, args).reduce(f));
    };
}
builtins["+"] = reducer((a, b) => num(a) + num(b));
builtins["*"] = reducer((a, b) => num(a) * num(b));
builtins["-"] = reducer((a, b) => num(a) - num(b));
builtins["/"] = reducer((a, b) => num(a) / num(b));
builtins["."] = reducer((a, b) => a + b);
// Basics
// `id` returns its input
builtins.id = (inp, args, ctx, cb) => cb(null, inp);
// `val` returns its first argument as is
builtins.val = (inp, args, ctx, cb) => cb(null, args[0]);
builtins.or = (inp, args, ctx, cb) => cb(null, inp || args[0]);
// `echo` returns its arguments joined as a string
builtins.echo = (inp, args, ctx, cb) => {
    cb(null, args.join(" "));
};
// `key` is `echo` without spaces, useful for building keys
builtins.key = (inp, args, ctx, cb) => cb(null, args.join(""));
// `num` coerces input into a number
builtins.num = (inp, args, ctx, cb) => cb(null, num(inp));
// `bool` coerces input into a boolean
builtins.bool = (inp, args, ctx, cb) => cb(null, bool(inp));
builtins.null = (inp, args, ctx, cb) => cb(null, null);
// `if [test] [value]`
builtins.if = (inp, args, ctx, cb) => {
    if (args[0]) {
        cb(null, args[1]);
    }
    else {
        cb(null);
    }
};
// `case [key] {cases}`
builtins.case = (inp, args, ctx, cb) => {
    const _case = args[0];
    const cases = args[1];
    cb(null, cases[_case]);
};
// Building objects and arrays
// list val val val -> [val, val, val]
builtins.list = (inp, args, ctx, cb) => cb(null, args);
// obj "key" val "key" val -> {key: val, key: val}
builtins.obj = (inp, args, ctx, cb) => {
    const abj = {};
    if (args.length) {
        let i = 0;
        while (i < args.length) {
            abj[args[i]] = args[i + 1];
            i += 2;
        }
    }
    cb(null, abj);
};
// range #start? #stop -> [#i]
builtins.range = (inp, args, ctx, cb) => {
    let i0, i1;
    if (args.length === 2) {
        i0 = num(args[0]);
        i1 = num(args[1]) - 1;
    }
    else {
        i0 = 0;
        i1 = num(args[0]) - 1;
    }
    const range = [];
    for (let i = i0; i <= i1; i++) {
        range.push(i);
    }
    cb(null, range);
};
// String operations
builtins.upper = (inp, args, ctx, cb) => cb(null, inp.toUpperCase());
builtins.lower = (inp, args, ctx, cb) => cb(null, inp.toLowerCase());
function capitalize(s) {
    return s[0].toUpperCase() + s.slice(1);
}
builtins.capitalize = (inp, args, ctx, cb) => cb(null, capitalize(inp));
builtins.string = (inp, args, ctx, cb) => cb(null, inp.toString());
// List operations
builtins.length = (inp, args, ctx, cb) => cb(null, inp.length);
builtins.reverse = (inp, args, ctx, cb) => {
    if (typeof inp === "string") {
        cb(null, inp.split("").reverse().join(""));
    }
    else {
        cb(null, inp.reverse());
    }
};
builtins.head = (inp, args, ctx, cb) => {
    const count = args[0] || 50;
    cb(null, inp.slice(0, count));
};
builtins.tail = (inp, args, ctx, cb) => {
    let count = args[0];
    if (count == null)
        count = 50;
    if (count < 1) {
        cb(null, []);
    }
    else {
        cb(null, inp.slice(inp.length - count));
    }
};
builtins.join = (inp, args, ctx, cb) => cb(null, inp.join(args[0] || " "));
builtins.split = (inp, args, ctx, cb) => cb(null, inp.split(args[0] || "\n"));
builtins.trim = (inp, args, ctx, cb) => cb(null, (args[0] || inp).trim());
builtins.sleep = (inp, args, ctx, cb) => {
    setTimeout(() => cb(null, inp), Number(args[0]));
};
// Matching, filtering
builtins.match = (inp, args, ctx, cb) => {
    let match_with;
    if (args.length === 2) {
        inp = args[0];
        match_with = args[1];
    }
    else {
        match_with = args[0];
    }
    const matched = [];
    for (const i of inp) {
        if (i.match(match_with)) {
            matched.push(i);
        }
    }
    cb(null, matched);
};
builtins.grep = builtins.match;
builtins.filter = (inp, args, ctx, cb) => {
    let filtered_inp = [];
    if (args.length > 0) {
        const filter_code = "return (" + args.join(" ") + ");";
        const filter_func = new Function("i", filter_code);
        filtered_inp = inp.filter(filter_func);
    }
    else {
        // Filter out null items
        for (const i of inp) {
            if (i)
                filtered_inp.push(i);
        }
    }
    cb(null, filtered_inp);
};
// Pass through without altering input (isn't this id?)
builtins.tee = (inp, args, ctx, cb) => {
    console.log(_inspect(inp));
    cb(null, inp);
};
builtins.parse = (inp, args, ctx, cb) => {
    cb(null, JSON.parse(inp));
};
builtins.log = (inp, args, ctx, cb) => {
    console.log(inp || args.join(" "));
    cb(null, inp);
};
builtins.inspect = (inp, args, ctx, cb) => {
    console.log("inp: " + _inspect(inp));
    console.log("args: " + _inspect(args));
    cb(null, inp);
};
builtins.stringify = (inp, args, ctx, cb) => {
    cb(null, JSON.stringify(inp));
};
builtins.sort = (inp, args, ctx, cb) => {
    let sort_by = args[0];
    if (sort_by) {
        if (sort_by[0] === "-") {
            sort_by = sort_by.slice(1);
            cb(null, inp.sort((a, b) => b[sort_by] - a[sort_by]));
        }
        else {
            cb(null, inp.sort((a, b) => a[sort_by] - b[sort_by]));
        }
    }
    else {
        cb(null, inp.sort());
    }
};
builtins.count = (inp, args, ctx, cb) => {
    const counts = {};
    const ki = {};
    let ik;
    if (args[0] != null) {
        ik = (i) => i[args[0]];
    }
    else {
        ik = (i) => i;
    }
    for (const i of inp) {
        const key = ik(i);
        if (counts[key] == null)
            counts[key] = 0;
        counts[key] += 1;
        ki[key] = i;
    }
    const counts_list = [];
    for (const [k, v] of Object.entries(counts)) {
        counts_list.push({
            item: ki[k],
            count: v,
        });
    }
    counts_list.sort((a, b) => a.count - b.count);
    cb(null, counts_list);
};
builtins.bin = (inp, args, ctx, cb) => {
    const count = Number(args[0]);
    const key = args[1];
    const ki = {};
    let ik;
    if (key != null) {
        ik = (i) => i[key];
    }
    else {
        ik = (i) => i;
    }
    let min = null;
    let max = null;
    const bins = [];
    for (const item of inp) {
        const k = ik(item);
        if (min == null || k < min) {
            min = k;
        }
        if (max == null || k > max) {
            max = k + 0.000000001;
        }
    }
    const interval = (max - min) / count;
    for (let i = 0; i < count; i++) {
        bins.push({
            start: i * interval + min,
            end: (i + 1) * interval + min,
            count: 0,
            items: [],
        });
    }
    for (const item of inp) {
        const bi = Math.floor((ik(item) - min) / interval);
        bins[bi].items.push(item);
        bins[bi].count += 1;
    }
    cb(null, bins);
};
builtins.chunks = (inp, args, ctx, cb) => {
    const n = args[0] || 10;
    const cs = [];
    for (let i = 0; i < n; i++) {
        cs.push([]);
    }
    for (let i = 0; i < inp.length; i++) {
        const ci = Math.floor(i / n);
        cs[ci].push(inp[i]);
    }
    cb(null, cs);
};
builtins.slice = (inp, args, ctx, cb) => {
    const a = args[0] || 0;
    const b = args[1] || inp.length;
    cb(null, inp.slice(a, b));
};
builtins.now = (inp, args, ctx, cb) => cb(null, new Date());
builtins.timestamp = (inp, args, ctx, cb) => cb(null, new Date().getTime());
builtins["oid-timestamp"] = (inp, args, ctx, cb) => {
    cb(null, parseInt((args[0] || inp).toString().substring(0, 8), 16) * 1000);
};
function randstr(len = 5) {
    let s = "";
    while (s.length < len) {
        s += Math.random()
            .toString(36)
            .slice(2, len - s.length + 2);
    }
    return s;
}
function randint(max = 100) {
    return Math.floor(Math.random() * max);
}
builtins.randstr = (inp, args, ctx, cb) => cb(null, randstr(args[0]));
builtins.randint = (inp, args, ctx, cb) => cb(null, randint(args[0]));
builtins.choice = (inp, args, ctx, cb) => {
    cb(null, _.sample(inp, 1)[0]);
};
builtins.sample = (inp, args, ctx, cb) => {
    cb(null, _.sample(inp, args[0] || inp.length / 2));
};
// Array functions
builtins.zip = (inp, args, ctx, cb) => {
    if (_.every(args, _.isArray)) {
        cb(null, _.zip(...args));
    }
    else {
        // split one list of args into two
        if (args.length % 2 === 1)
            args.push(null);
        const l1 = _.first(args, args.length / 2);
        const l2 = _.last(args, args.length / 2);
        cb(null, _.zip(l1, l2));
    }
};
builtins.zipobj = (inp, args, ctx, cb) => {
    builtins.zip(inp, args, ctx, (err, zipped) => {
        cb(null, _.object(zipped));
    });
};
// Underscore methods
const umethods = _.pick(_, [
    "keys",
    "values",
    "pairs",
    "pick",
    "omit",
    "extend",
    "defaults",
    "where",
    "findWhere",
    "sortBy",
    "groupBy",
    "indexBy",
    "countBy",
    "shuffle",
    "uniq",
    "flatten",
    "without",
    "union",
    "intersection",
    "difference",
]);
// Wrap them using `sync` and `with_inp` options
Object.assign(builtins, helpers.wrapall(umethods, "", true, true));
// Modifying the environment
builtins.set = (inp, args, ctx, cb) => {
    const data = args[1] || inp;
    ctx.set("vars", args[0], data);
    cb(null, data);
};
builtins.setall = (inp, args, ctx, cb) => {
    const data = args[1] || inp;
    for (const [k, v] of Object.entries(data)) {
        ctx.set("vars", k, v);
    }
    cb(null, data);
};
// `inc` increments a number given a key
builtins.inc = (inp, args, ctx, cb) => {
    const inc_key = args[0];
    if (ctx[inc_key] == null)
        ctx[inc_key] = 0;
    cb(null, ++ctx[inc_key]);
};
// `push` adds input to the end of the specified array
builtins.push = (inp, args, ctx, cb) => {
    const data = args[1] || inp;
    let l = ctx.get("vars", args[0]) || [];
    l.push(data);
    ctx.set("vars", args[0], l);
    cb(null, l);
};
// `ginc` gets or increments a number given a key and object key
builtins.ginc = (inp, args, ctx, cb) => {
    const inc_key = args[0];
    const obj_key = args[1];
    if (ctx[inc_key] == null) {
        ctx[inc_key] = {
            val: 0,
            objs: {},
        };
    }
    if (ctx[inc_key].objs[obj_key] != null) {
        cb(null, ctx[inc_key].objs[obj_key]);
    }
    else {
        const obj_val = ++ctx[inc_key].val;
        ctx[inc_key].objs[obj_key] = obj_val;
        cb(null, obj_val);
    }
};
// Including modules
builtins.use = (inp, args, ctx, cb) => {
    for (const arg of args) {
        ctx.topScope().use(arg);
    }
    cb(null, "Using: " + args.join(", "));
};
builtins.alias = (inp, args, ctx, cb) => {
    const alias = args[0];
    const script = args[1];
    if (!script) {
        // Showing an alias
        cb(null, ctx.get("aliases", alias));
    }
    else {
        // Setting an alias
        ctx.alias(alias, script);
        cb(null, {
            success: true,
            alias: alias,
            script: script,
        });
    }
};
builtins.aliases = (inp, args, ctx, cb) => {
    if (!inp) {
        // Showing aliases
        cb(null, ctx.get("aliases"));
    }
    else {
        // Setting aliases
        for (const [alias, script] of Object.entries(inp)) {
            ctx.alias(alias, script);
        }
        cb(null, {
            success: true,
            aliases: inp,
        });
    }
};
module.exports = builtins;
//# sourceMappingURL=builtins.js.map