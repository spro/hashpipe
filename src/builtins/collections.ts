import * as async from "async"
import { Callback, Lambda, wrapall } from "../helpers"
import { BuiltinMap, resolveCallable, toNumber } from "./common"

// Array/object construction, traversal, and aggregation helpers.

type AnyRecord = Record<string, any>

type Iteratee<T> = ((item: T) => any) | keyof T | string

function getValue<T extends AnyRecord>(item: T, iteratee?: Iteratee<T>): any {
    if (!iteratee) {
        return item
    }
    if (typeof iteratee === "function") {
        return iteratee(item)
    }
    return (item as AnyRecord)[iteratee as string]
}

function buildObjectFromArgs(args: any[]): AnyRecord {
    const result: AnyRecord = {}
    for (let i = 0; i < args.length; i += 2) {
        result[args[i]] = args[i + 1]
    }
    return result
}

function zipArgs(args: any[]): any[] {
    if (args.every(Array.isArray)) {
        const longest = Math.max(...args.map((arr) => arr.length))
        const result: any[][] = []
        for (let i = 0; i < longest; i++) {
            result.push(args.map((arr) => arr[i]))
        }
        return result
    }
    const copy = args.slice()
    if (copy.length % 2 === 1) copy.push(null)
    const half = copy.length / 2
    const first = copy.slice(0, half)
    const second = copy.slice(half)
    const longest = Math.max(first.length, second.length)
    const zipped: any[][] = []
    for (let i = 0; i < longest; i++) {
        zipped.push([first[i], second[i]])
    }
    return zipped
}

function flattenDeep(list: any[], shallow = false): any[] {
    const result: any[] = []
    for (const item of list) {
        if (Array.isArray(item)) {
            if (shallow) {
                result.push(...item)
            } else {
                result.push(...flattenDeep(item, false))
            }
        } else {
            result.push(item)
        }
    }
    return result
}

function unique(list: any[]): any[] {
    const seen = new Set<any>()
    const result: any[] = []
    for (const item of list) {
        if (!seen.has(item)) {
            seen.add(item)
            result.push(item)
        }
    }
    return result
}

function withoutValues(list: any[], values: any[]): any[] {
    const blacklist = new Set(values)
    return list.filter((item) => !blacklist.has(item))
}

function intersectionValues(lists: any[][]): any[] {
    if (!lists.length) return []
    return lists[0].filter((item) => lists.every((arr) => arr.includes(item)))
}

function differenceValues(list: any[], others: any[][]): any[] {
    const blacklist = new Set(others.flat())
    return list.filter((item) => !blacklist.has(item))
}

function shuffleList(list: any[]): any[] {
    const copy = list.slice()
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
}

const list = (
    inp: any,
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    cb(null, args)
}

const obj = (
    inp: any,
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    cb(null, buildObjectFromArgs(args))
}

const range = (
    inp: any,
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    let start: number
    let end: number
    if (args.length === 2) {
        start = toNumber(args[0])
        end = toNumber(args[1]) - 1
    } else {
        start = 0
        end = toNumber(args[0]) - 1
    }
    const values: number[] = []
    for (let i = start; i <= end; i++) {
        values.push(i)
    }
    cb(null, values)
}

const length = (
    inp: any,
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    cb(null, inp.length)
}

const reverse = (
    inp: any,
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    if (typeof inp === "string") {
        cb(null, inp.split("").reverse().join(""))
    } else {
        cb(null, inp.slice().reverse())
    }
}

const head = (
    inp: any[],
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    const count = args[0] || 50
    cb(null, inp.slice(0, count))
}

const tail = (
    inp: any[],
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    const count = args[0] || 50
    if (count < 1) {
        cb(null, [])
    } else {
        cb(null, inp.slice(Math.max(inp.length - count, 0)))
    }
}

const join = (
    inp: any[],
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    cb(null, inp.join(args[0] || " "))
}

const split = (
    inp: string,
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    cb(null, inp.split(args[0] || "\n"))
}

const match = (
    inp: any,
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    let source = inp
    let pattern: string = args[0]
    if (args.length === 2) {
        source = args[0]
        pattern = args[1]
    }
    const regex = new RegExp(pattern)
    const matched: any[] = []
    for (const item of source) {
        if (regex.test(item)) matched.push(item)
    }
    cb(null, matched)
}

const filter = (
    inp: any[],
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    const callable = resolveCallable(args[0], ctx)
    if (callable) {
        const rest = args.slice(1)
        async.map(
            inp,
            (item: any, _cb: Callback) => callable(item, rest, _cb),
            (err: any, keeps?: any[]) => {
                if (err) return cb(err)
                cb(
                    null,
                    inp.filter((_, i) => keeps![i]),
                )
            },
        )
    } else if (args.length > 0) {
        // Legacy: a raw JavaScript expression over `i`
        const filterCode = "return (" + args.join(" ") + ");"
        const filterFn = new Function("i", filterCode) as (item: any) => boolean
        cb(null, inp.filter(filterFn))
    } else {
        cb(null, inp.filter(Boolean))
    }
}

const map = (
    inp: any[],
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    const callable = resolveCallable(args[0], ctx)
    if (!callable) {
        return cb(`map: not a lambda or command name: ${args[0]}`)
    }
    const rest = args.slice(1)
    async.map(inp, (item: any, _cb: Callback) => callable(item, rest, _cb), cb)
}

const each = (
    inp: any[],
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    const callable = resolveCallable(args[0], ctx)
    if (!callable) {
        return cb(`each: not a lambda or command name: ${args[0]}`)
    }
    const rest = args.slice(1)
    async.mapSeries(
        inp,
        (item: any, _cb: Callback) => callable(item, rest, _cb),
        (err: any) => {
            if (err) return cb(err)
            cb(null, inp)
        },
    )
}

const reduce = (
    inp: any[],
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    const callable = resolveCallable(args[0], ctx)
    if (!callable) {
        return cb(`reduce: not a lambda or command name: ${args[0]}`)
    }
    const items = inp.slice()
    const memo = args.length > 1 ? args[1] : items.shift()
    async.reduce(
        items,
        memo,
        (acc: any, item: any, _cb: Callback) => callable(acc, [item], _cb),
        cb,
    )
}

// Map items to keys through a lambda, asynchronously
const lambdaKeys = (
    inp: any[],
    lam: Lambda,
    cb: (err: any, keys?: any[]) => void,
) => {
    async.map(inp, (item: any, _cb: Callback) => lam.call(item, [], _cb), cb)
}

const sort = (
    inp: any[],
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    const copy = inp.slice()
    let iteratee = args[0]
    if (iteratee) {
        let descending = false
        if (typeof iteratee === "string" && iteratee.startsWith("-")) {
            descending = true
            iteratee = iteratee.slice(1)
        }
        copy.sort((a, b) => {
            const aVal = getValue(a, iteratee)
            const bVal = getValue(b, iteratee)
            if (aVal === bVal) return 0
            if (aVal > bVal) return descending ? -1 : 1
            return descending ? 1 : -1
        })
    } else {
        copy.sort()
    }
    cb(null, copy)
}

const count = (
    inp: any[],
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    const iteratee = args[0]
    const counts = new Map<any, { item: any; count: number }>()
    for (const item of inp) {
        const key = getValue(item, iteratee as any)
        const entry = counts.get(key)
        if (entry) {
            entry.count += 1
        } else {
            counts.set(key, { item, count: 1 })
        }
    }
    cb(
        null,
        Array.from(counts.values()).sort((a, b) => a.count - b.count),
    )
}

const bin = (
    inp: any[],
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    const binCount = Number(args[0]) || 0
    const key = args[1]
    if (binCount <= 0) {
        cb(null, [])
        return
    }
    const extractor =
        key != null ? (item: any) => item[key] : (item: any) => item
    let min: number | null = null
    let max: number | null = null
    for (const item of inp) {
        const value = extractor(item)
        if (typeof value !== "number") continue
        if (min == null || value < min) min = value
        if (max == null || value > max) max = value
    }
    if (min == null || max == null) {
        cb(null, [])
        return
    }
    const bins: any[] = []
    const epsilon = 1e-9
    const interval = (max - min + epsilon) / binCount
    for (let i = 0; i < binCount; i++) {
        bins.push({
            start: min + i * interval,
            end: min + (i + 1) * interval,
            count: 0,
            items: [] as any[],
        })
    }
    for (const item of inp) {
        const value = extractor(item)
        if (typeof value !== "number") continue
        let index = Math.floor((value - min) / interval)
        if (index >= binCount) index = binCount - 1
        bins[index].items.push(item)
        bins[index].count += 1
    }
    cb(null, bins)
}

const chunks = (
    inp: any[],
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    const chunkSize = args[0] || 10
    const result: any[][] = []
    for (let i = 0; i < inp.length; i++) {
        const index = Math.floor(i / chunkSize)
        if (!result[index]) result[index] = []
        result[index].push(inp[i])
    }
    cb(null, result)
}

const slice = (
    inp: any[],
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    const start = args[0] || 0
    const end = args[1] || inp.length
    cb(null, inp.slice(start, end))
}

const zip = (
    inp: any,
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    cb(null, zipArgs(args))
}

const zipobj = (
    inp: any,
    args: any[],
    ctx: any,
    cb: (err: any, result?: any) => void,
) => {
    const zipped = zipArgs(args)
    const result: AnyRecord = {}
    for (const [key, value] of zipped) {
        if (key != null) {
            result[key] = value
        }
    }
    cb(null, result)
}

const collectionHelpers = {
    keys: (obj: AnyRecord) => Object.keys(Object(obj)),
    values: (obj: AnyRecord) => Object.values(Object(obj)),
    pairs: (obj: AnyRecord) => Object.entries(Object(obj)),
    pick: (obj: AnyRecord, ...keys: string[]) => {
        const result: AnyRecord = {}
        for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                result[key] = obj[key]
            }
        }
        return result
    },
    omit: (obj: AnyRecord, ...keys: string[]) => {
        const blacklist = new Set(keys)
        const result: AnyRecord = {}
        for (const [key, value] of Object.entries(Object(obj))) {
            if (!blacklist.has(key)) {
                result[key] = value
            }
        }
        return result
    },
    extend: (target: AnyRecord, ...sources: AnyRecord[]) => {
        return Object.assign(target, ...sources)
    },
    defaults: (target: AnyRecord, ...sources: AnyRecord[]) => {
        for (const source of sources) {
            for (const [key, value] of Object.entries(source)) {
                if (target[key] === undefined) {
                    target[key] = value
                }
            }
        }
        return target
    },
    where: <T extends AnyRecord>(list: T[], attrs: AnyRecord) => {
        return list.filter((item) => {
            for (const [key, value] of Object.entries(attrs || {})) {
                if ((item as AnyRecord)[key] !== value) return false
            }
            return true
        })
    },
    findWhere: <T extends AnyRecord>(list: T[], attrs: AnyRecord) => {
        return collectionHelpers.where(list, attrs)[0]
    },
    sortBy: <T>(list: T[], iteratee?: Iteratee<T>) => {
        const copy = list.slice()
        copy.sort((a, b) => {
            const aVal = getValue(a as any, iteratee)
            const bVal = getValue(b as any, iteratee)
            if (aVal === bVal) return 0
            return aVal > bVal ? 1 : -1
        })
        return copy
    },
    groupBy: <T>(list: T[], iteratee?: Iteratee<T>) => {
        const result: Record<string, T[]> = {}
        for (const item of list) {
            const key = String(getValue(item as any, iteratee))
            if (!result[key]) result[key] = []
            result[key].push(item)
        }
        return result
    },
    indexBy: <T>(list: T[], iteratee?: Iteratee<T>) => {
        const result: Record<string, T> = {}
        for (const item of list) {
            const key = String(getValue(item as any, iteratee))
            result[key] = item
        }
        return result
    },
    countBy: <T>(list: T[], iteratee?: Iteratee<T>) => {
        const counts: Record<string, number> = {}
        for (const item of list) {
            const key = String(getValue(item as any, iteratee))
            counts[key] = (counts[key] || 0) + 1
        }
        return counts
    },
    shuffle: shuffleList,
    uniq: unique,
    flatten: (list: any[], shallow?: boolean) => flattenDeep(list, shallow),
    without: (list: any[], ...values: any[]) => withoutValues(list, values),
    union: (...lists: any[][]) => unique(lists.flat()),
    intersection: (...lists: any[][]) => intersectionValues(lists),
    difference: (list: any[], ...others: any[][]) =>
        differenceValues(list, others),
}

const collectionsBuiltins: BuiltinMap = {
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
}

Object.assign(collectionsBuiltins, wrapall(collectionHelpers, "", true, true))

// sortBy/groupBy take either a key name (string, as before) or a lambda
// key extractor. Bare command names stay strings here so object keys that
// happen to match a command are never misread as callables.

collectionsBuiltins.sortBy = (inp, args, ctx, cb) => {
    if (args[0] instanceof Lambda) {
        lambdaKeys(inp, args[0], (err, keys) => {
            if (err) return cb(err)
            const paired = inp.map((item: any, i: number) => [keys![i], item])
            paired.sort((a: any[], b: any[]) => {
                if (a[0] === b[0]) return 0
                return a[0] > b[0] ? 1 : -1
            })
            cb(
                null,
                paired.map((pair: any[]) => pair[1]),
            )
        })
    } else {
        cb(null, collectionHelpers.sortBy(inp, args[0]))
    }
}

collectionsBuiltins.groupBy = (inp, args, ctx, cb) => {
    if (args[0] instanceof Lambda) {
        lambdaKeys(inp, args[0], (err, keys) => {
            if (err) return cb(err)
            const groups: Record<string, any[]> = {}
            inp.forEach((item: any, i: number) => {
                const key = String(keys![i])
                if (!groups[key]) groups[key] = []
                groups[key].push(item)
            })
            cb(null, groups)
        })
    } else {
        cb(null, collectionHelpers.groupBy(inp, args[0]))
    }
}

export default collectionsBuiltins
