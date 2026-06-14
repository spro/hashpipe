import { Lambda, command, wrapall } from "../helpers"
import { BuiltinMap, Callable, resolveCallable, toNumber } from "./common"

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

const callCallable = (callable: Callable, inp: any, args: any[] = []) =>
    Promise.resolve(callable(inp, args))

const list = command((inp, args) => args)

const obj = command((inp, args) => buildObjectFromArgs(args))

const range = command((inp, args) => {
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
    return values
})

const length = command((inp) => inp.length)

const reverse = command((inp) => {
    if (typeof inp === "string") {
        return inp.split("").reverse().join("")
    }
    return inp.slice().reverse()
})

const head = command((inp: any[], args) => {
    const count = args[0] || 50
    return inp.slice(0, count)
})

const tail = command((inp: any[], args) => {
    const count = args[0] || 50
    if (count < 1) {
        return []
    }
    return inp.slice(Math.max(inp.length - count, 0))
})

const join = command((inp: any[], args) => inp.join(args[0] || " "))

const split = command((inp: string, args) => inp.split(args[0] || "\n"))

const match = command((inp, args) => {
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
    return matched
})

const filter = command(async (inp: any[], args, ctx) => {
    const callable = resolveCallable(args[0], ctx)
    if (callable) {
        const rest = args.slice(1)
        const keeps = await Promise.all(
            inp.map((item) => callCallable(callable, item, rest)),
        )
        return inp.filter((_, i) => keeps[i])
    }
    if (args.length > 0) {
        // Legacy: a raw JavaScript expression over `i`
        const filterCode = "return (" + args.join(" ") + ");"
        const filterFn = new Function("i", filterCode) as (item: any) => boolean
        return inp.filter(filterFn)
    }
    return inp.filter(Boolean)
})

const map = command(async (inp: any[], args, ctx) => {
    const callable = resolveCallable(args[0], ctx)
    if (!callable) {
        throw new Error(`map: not a lambda or command name: ${args[0]}`)
    }
    const rest = args.slice(1)
    return Promise.all(inp.map((item) => callCallable(callable, item, rest)))
})

const each = command(async (inp: any[], args, ctx) => {
    const callable = resolveCallable(args[0], ctx)
    if (!callable) {
        throw new Error(`each: not a lambda or command name: ${args[0]}`)
    }
    const rest = args.slice(1)
    for (const item of inp) {
        await callCallable(callable, item, rest)
    }
    return inp
})

const reduce = command(async (inp: any[], args, ctx) => {
    const callable = resolveCallable(args[0], ctx)
    if (!callable) {
        throw new Error(`reduce: not a lambda or command name: ${args[0]}`)
    }
    const items = inp.slice()
    let memo = args.length > 1 ? args[1] : items.shift()
    for (const item of items) {
        memo = await callCallable(callable, memo, [item])
    }
    return memo
})

// Map items to keys through a lambda, asynchronously
const lambdaKeys = (inp: any[], lam: Lambda): Promise<any[]> =>
    Promise.all(inp.map((item) => lam.call(item, [])))

const sort = command((inp: any[], args) => {
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
    return copy
})

const count = command((inp: any[], args) => {
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
    return Array.from(counts.values()).sort((a, b) => a.count - b.count)
})

const bin = command((inp: any[], args) => {
    const binCount = Number(args[0]) || 0
    const key = args[1]
    if (binCount <= 0) {
        return []
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
        return []
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
    return bins
})

const chunks = command((inp: any[], args) => {
    const chunkSize = args[0] || 10
    const result: any[][] = []
    for (let i = 0; i < inp.length; i++) {
        const index = Math.floor(i / chunkSize)
        if (!result[index]) result[index] = []
        result[index].push(inp[i])
    }
    return result
})

const slice = command((inp: any[], args) => {
    const start = args[0] || 0
    const end = args[1] || inp.length
    return inp.slice(start, end)
})

const zip = command((inp, args) => zipArgs(args))

const zipobj = command((inp, args) => {
    const zipped = zipArgs(args)
    const result: AnyRecord = {}
    for (const [key, value] of zipped) {
        if (key != null) {
            result[key] = value
        }
    }
    return result
})

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

collectionsBuiltins.sortBy = command(async (inp, args) => {
    if (args[0] instanceof Lambda) {
        const keys = await lambdaKeys(inp, args[0])
        const paired = inp.map((item: any, i: number) => [keys[i], item])
        paired.sort((a: any[], b: any[]) => {
            if (a[0] === b[0]) return 0
            return a[0] > b[0] ? 1 : -1
        })
        return paired.map((pair: any[]) => pair[1])
    }
    return collectionHelpers.sortBy(inp, args[0])
})

collectionsBuiltins.groupBy = command(async (inp, args) => {
    if (args[0] instanceof Lambda) {
        const keys = await lambdaKeys(inp, args[0])
        const groups: Record<string, any[]> = {}
        inp.forEach((item: any, i: number) => {
            const key = String(keys[i])
            if (!groups[key]) groups[key] = []
            groups[key].push(item)
        })
        return groups
    }
    return collectionHelpers.groupBy(inp, args[0])
})

export default collectionsBuiltins
