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
const async = __importStar(require("async"));
const helpers_1 = require("../helpers");
const common_1 = require("./common");
function getValue(item, iteratee) {
    if (!iteratee) {
        return item;
    }
    if (typeof iteratee === "function") {
        return iteratee(item);
    }
    return item[iteratee];
}
function buildObjectFromArgs(args) {
    const result = {};
    for (let i = 0; i < args.length; i += 2) {
        result[args[i]] = args[i + 1];
    }
    return result;
}
function zipArgs(args) {
    if (args.every(Array.isArray)) {
        const longest = Math.max(...args.map((arr) => arr.length));
        const result = [];
        for (let i = 0; i < longest; i++) {
            result.push(args.map((arr) => arr[i]));
        }
        return result;
    }
    const copy = args.slice();
    if (copy.length % 2 === 1)
        copy.push(null);
    const half = copy.length / 2;
    const first = copy.slice(0, half);
    const second = copy.slice(half);
    const longest = Math.max(first.length, second.length);
    const zipped = [];
    for (let i = 0; i < longest; i++) {
        zipped.push([first[i], second[i]]);
    }
    return zipped;
}
function flattenDeep(list, shallow = false) {
    const result = [];
    for (const item of list) {
        if (Array.isArray(item)) {
            if (shallow) {
                result.push(...item);
            }
            else {
                result.push(...flattenDeep(item, false));
            }
        }
        else {
            result.push(item);
        }
    }
    return result;
}
function unique(list) {
    const seen = new Set();
    const result = [];
    for (const item of list) {
        if (!seen.has(item)) {
            seen.add(item);
            result.push(item);
        }
    }
    return result;
}
function withoutValues(list, values) {
    const blacklist = new Set(values);
    return list.filter((item) => !blacklist.has(item));
}
function intersectionValues(lists) {
    if (!lists.length)
        return [];
    return lists[0].filter((item) => lists.every((arr) => arr.includes(item)));
}
function differenceValues(list, others) {
    const blacklist = new Set(others.flat());
    return list.filter((item) => !blacklist.has(item));
}
function shuffleList(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
const list = (inp, args, ctx, cb) => {
    cb(null, args);
};
const obj = (inp, args, ctx, cb) => {
    cb(null, buildObjectFromArgs(args));
};
const range = (inp, args, ctx, cb) => {
    let start;
    let end;
    if (args.length === 2) {
        start = (0, common_1.toNumber)(args[0]);
        end = (0, common_1.toNumber)(args[1]) - 1;
    }
    else {
        start = 0;
        end = (0, common_1.toNumber)(args[0]) - 1;
    }
    const values = [];
    for (let i = start; i <= end; i++) {
        values.push(i);
    }
    cb(null, values);
};
const length = (inp, args, ctx, cb) => {
    cb(null, inp.length);
};
const reverse = (inp, args, ctx, cb) => {
    if (typeof inp === "string") {
        cb(null, inp.split("").reverse().join(""));
    }
    else {
        cb(null, inp.slice().reverse());
    }
};
const head = (inp, args, ctx, cb) => {
    const count = args[0] || 50;
    cb(null, inp.slice(0, count));
};
const tail = (inp, args, ctx, cb) => {
    const count = args[0] || 50;
    if (count < 1) {
        cb(null, []);
    }
    else {
        cb(null, inp.slice(Math.max(inp.length - count, 0)));
    }
};
const join = (inp, args, ctx, cb) => {
    cb(null, inp.join(args[0] || " "));
};
const split = (inp, args, ctx, cb) => {
    cb(null, inp.split(args[0] || "\n"));
};
const match = (inp, args, ctx, cb) => {
    let source = inp;
    let pattern = args[0];
    if (args.length === 2) {
        source = args[0];
        pattern = args[1];
    }
    const regex = new RegExp(pattern);
    const matched = [];
    for (const item of source) {
        if (regex.test(item))
            matched.push(item);
    }
    cb(null, matched);
};
const filter = (inp, args, ctx, cb) => {
    const callable = (0, common_1.resolveCallable)(args[0], ctx);
    if (callable) {
        const rest = args.slice(1);
        async.map(inp, (item, _cb) => callable(item, rest, _cb), (err, keeps) => {
            if (err)
                return cb(err);
            cb(null, inp.filter((_, i) => keeps[i]));
        });
    }
    else if (args.length > 0) {
        // Legacy: a raw JavaScript expression over `i`
        const filterCode = "return (" + args.join(" ") + ");";
        const filterFn = new Function("i", filterCode);
        cb(null, inp.filter(filterFn));
    }
    else {
        cb(null, inp.filter(Boolean));
    }
};
const map = (inp, args, ctx, cb) => {
    const callable = (0, common_1.resolveCallable)(args[0], ctx);
    if (!callable) {
        return cb(`map: not a lambda or command name: ${args[0]}`);
    }
    const rest = args.slice(1);
    async.map(inp, (item, _cb) => callable(item, rest, _cb), cb);
};
const each = (inp, args, ctx, cb) => {
    const callable = (0, common_1.resolveCallable)(args[0], ctx);
    if (!callable) {
        return cb(`each: not a lambda or command name: ${args[0]}`);
    }
    const rest = args.slice(1);
    async.mapSeries(inp, (item, _cb) => callable(item, rest, _cb), (err) => {
        if (err)
            return cb(err);
        cb(null, inp);
    });
};
const reduce = (inp, args, ctx, cb) => {
    const callable = (0, common_1.resolveCallable)(args[0], ctx);
    if (!callable) {
        return cb(`reduce: not a lambda or command name: ${args[0]}`);
    }
    const items = inp.slice();
    const memo = args.length > 1 ? args[1] : items.shift();
    async.reduce(items, memo, (acc, item, _cb) => callable(acc, [item], _cb), cb);
};
// Map items to keys through a lambda, asynchronously
const lambdaKeys = (inp, lam, cb) => {
    async.map(inp, (item, _cb) => lam.call(item, [], _cb), cb);
};
const sort = (inp, args, ctx, cb) => {
    const copy = inp.slice();
    let iteratee = args[0];
    if (iteratee) {
        let descending = false;
        if (typeof iteratee === "string" && iteratee.startsWith("-")) {
            descending = true;
            iteratee = iteratee.slice(1);
        }
        copy.sort((a, b) => {
            const aVal = getValue(a, iteratee);
            const bVal = getValue(b, iteratee);
            if (aVal === bVal)
                return 0;
            if (aVal > bVal)
                return descending ? -1 : 1;
            return descending ? 1 : -1;
        });
    }
    else {
        copy.sort();
    }
    cb(null, copy);
};
const count = (inp, args, ctx, cb) => {
    const iteratee = args[0];
    const counts = new Map();
    for (const item of inp) {
        const key = getValue(item, iteratee);
        const entry = counts.get(key);
        if (entry) {
            entry.count += 1;
        }
        else {
            counts.set(key, { item, count: 1 });
        }
    }
    cb(null, Array.from(counts.values()).sort((a, b) => a.count - b.count));
};
const bin = (inp, args, ctx, cb) => {
    const binCount = Number(args[0]) || 0;
    const key = args[1];
    if (binCount <= 0) {
        cb(null, []);
        return;
    }
    const extractor = key != null ? (item) => item[key] : (item) => item;
    let min = null;
    let max = null;
    for (const item of inp) {
        const value = extractor(item);
        if (typeof value !== "number")
            continue;
        if (min == null || value < min)
            min = value;
        if (max == null || value > max)
            max = value;
    }
    if (min == null || max == null) {
        cb(null, []);
        return;
    }
    const bins = [];
    const epsilon = 1e-9;
    const interval = (max - min + epsilon) / binCount;
    for (let i = 0; i < binCount; i++) {
        bins.push({
            start: min + i * interval,
            end: min + (i + 1) * interval,
            count: 0,
            items: [],
        });
    }
    for (const item of inp) {
        const value = extractor(item);
        if (typeof value !== "number")
            continue;
        let index = Math.floor((value - min) / interval);
        if (index >= binCount)
            index = binCount - 1;
        bins[index].items.push(item);
        bins[index].count += 1;
    }
    cb(null, bins);
};
const chunks = (inp, args, ctx, cb) => {
    const chunkSize = args[0] || 10;
    const result = [];
    for (let i = 0; i < inp.length; i++) {
        const index = Math.floor(i / chunkSize);
        if (!result[index])
            result[index] = [];
        result[index].push(inp[i]);
    }
    cb(null, result);
};
const slice = (inp, args, ctx, cb) => {
    const start = args[0] || 0;
    const end = args[1] || inp.length;
    cb(null, inp.slice(start, end));
};
const zip = (inp, args, ctx, cb) => {
    cb(null, zipArgs(args));
};
const zipobj = (inp, args, ctx, cb) => {
    const zipped = zipArgs(args);
    const result = {};
    for (const [key, value] of zipped) {
        if (key != null) {
            result[key] = value;
        }
    }
    cb(null, result);
};
const collectionHelpers = {
    keys: (obj) => Object.keys(Object(obj)),
    values: (obj) => Object.values(Object(obj)),
    pairs: (obj) => Object.entries(Object(obj)),
    pick: (obj, ...keys) => {
        const result = {};
        for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                result[key] = obj[key];
            }
        }
        return result;
    },
    omit: (obj, ...keys) => {
        const blacklist = new Set(keys);
        const result = {};
        for (const [key, value] of Object.entries(Object(obj))) {
            if (!blacklist.has(key)) {
                result[key] = value;
            }
        }
        return result;
    },
    extend: (target, ...sources) => {
        return Object.assign(target, ...sources);
    },
    defaults: (target, ...sources) => {
        for (const source of sources) {
            for (const [key, value] of Object.entries(source)) {
                if (target[key] === undefined) {
                    target[key] = value;
                }
            }
        }
        return target;
    },
    where: (list, attrs) => {
        return list.filter((item) => {
            for (const [key, value] of Object.entries(attrs || {})) {
                if (item[key] !== value)
                    return false;
            }
            return true;
        });
    },
    findWhere: (list, attrs) => {
        return collectionHelpers.where(list, attrs)[0];
    },
    sortBy: (list, iteratee) => {
        const copy = list.slice();
        copy.sort((a, b) => {
            const aVal = getValue(a, iteratee);
            const bVal = getValue(b, iteratee);
            if (aVal === bVal)
                return 0;
            return aVal > bVal ? 1 : -1;
        });
        return copy;
    },
    groupBy: (list, iteratee) => {
        const result = {};
        for (const item of list) {
            const key = String(getValue(item, iteratee));
            if (!result[key])
                result[key] = [];
            result[key].push(item);
        }
        return result;
    },
    indexBy: (list, iteratee) => {
        const result = {};
        for (const item of list) {
            const key = String(getValue(item, iteratee));
            result[key] = item;
        }
        return result;
    },
    countBy: (list, iteratee) => {
        const counts = {};
        for (const item of list) {
            const key = String(getValue(item, iteratee));
            counts[key] = (counts[key] || 0) + 1;
        }
        return counts;
    },
    shuffle: shuffleList,
    uniq: unique,
    flatten: (list, shallow) => flattenDeep(list, shallow),
    without: (list, ...values) => withoutValues(list, values),
    union: (...lists) => unique(lists.flat()),
    intersection: (...lists) => intersectionValues(lists),
    difference: (list, ...others) => differenceValues(list, others),
};
const collectionsBuiltins = {
    list,
    obj,
    range,
    length,
    reverse,
    head,
    tail,
    join,
    split,
    match,
    grep: match,
    filter,
    map,
    each,
    reduce,
    sort,
    count,
    bin,
    chunks,
    slice,
    zip,
    zipobj,
};
Object.assign(collectionsBuiltins, (0, helpers_1.wrapall)(collectionHelpers, "", true, true));
// sortBy/groupBy take either a key name (string, as before) or a lambda
// key extractor. Bare command names stay strings here so object keys that
// happen to match a command are never misread as callables.
collectionsBuiltins.sortBy = (inp, args, ctx, cb) => {
    if (args[0] instanceof helpers_1.Lambda) {
        lambdaKeys(inp, args[0], (err, keys) => {
            if (err)
                return cb(err);
            const paired = inp.map((item, i) => [keys[i], item]);
            paired.sort((a, b) => {
                if (a[0] === b[0])
                    return 0;
                return a[0] > b[0] ? 1 : -1;
            });
            cb(null, paired.map((pair) => pair[1]));
        });
    }
    else {
        cb(null, collectionHelpers.sortBy(inp, args[0]));
    }
};
collectionsBuiltins.groupBy = (inp, args, ctx, cb) => {
    if (args[0] instanceof helpers_1.Lambda) {
        lambdaKeys(inp, args[0], (err, keys) => {
            if (err)
                return cb(err);
            const groups = {};
            inp.forEach((item, i) => {
                const key = String(keys[i]);
                if (!groups[key])
                    groups[key] = [];
                groups[key].push(item);
            });
            cb(null, groups);
        });
    }
    else {
        cb(null, collectionHelpers.groupBy(inp, args[0]));
    }
};
exports.default = collectionsBuiltins;
//# sourceMappingURL=collections.js.map