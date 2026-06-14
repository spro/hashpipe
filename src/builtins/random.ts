import { BuiltinMap } from "./common"
import { command } from "../helpers"

// Random generators and sampling utilities.

function randstr(length: number = 5): string {
    let value = ""
    while (value.length < length) {
        value += Math.random()
            .toString(36)
            .slice(2, length - value.length + 2)
    }
    return value
}

function randint(max: number = 100): number {
    return Math.floor(Math.random() * max)
}

function sampleSingle<T>(list: T[]): T | undefined {
    if (!list.length) return undefined
    const index = Math.floor(Math.random() * list.length)
    return list[index]
}

function sampleMany<T>(list: T[], size: number): T[] {
    if (size >= list.length) {
        return shuffle(list)
    }
    const copy = shuffle(list)
    return copy.slice(0, size)
}

function shuffle<T>(list: T[]): T[] {
    const copy = list.slice()
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
}

const randomBuiltins: BuiltinMap = {
    randstr: command((inp, args) => randstr(args[0])),
    randint: command((inp, args) => randint(args[0])),
    choice: command((inp) => sampleSingle(inp)),
    sample: command((inp, args) => {
        const requested = Number(args[0])
        const size = Number.isFinite(requested)
            ? Math.max(0, Math.floor(requested))
            : Math.floor(inp.length / 2)
        return sampleMany(inp, size)
    }),
}

export default randomBuiltins
