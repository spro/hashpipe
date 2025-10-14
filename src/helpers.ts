import { inspect } from "util"

export type Callback<T = any> = (err: any, result?: T) => void
export type HashpipeFunction = (
    inp: any,
    args: any[],
    ctx: any,
    cb: Callback,
) => void

export function prettyPrint(o: any): string {
    if (typeof o === "object") {
        return inspect(o, { depth: null, colors: true })
    } else {
        return String(o)
    }
}

export function wrapone(
    f: (...args: any[]) => void,
    with_inp: boolean = false,
): HashpipeFunction {
    return (inp: any, args: any[], ctx: any, cb: Callback) => {
        if (with_inp) {
            args.unshift(inp)
        }
        f(...args, cb)
    }
}

export function wraponeSync(
    f: (...args: any[]) => any,
    with_inp: boolean = false,
): HashpipeFunction {
    return (inp: any, args: any[], ctx: any, cb: Callback) => {
        if (with_inp) {
            args.unshift(inp)
        }
        cb(null, f(...args))
    }
}

export function wrapall(
    o: Record<string, any>,
    pre: string = "",
    with_inp: boolean = false,
    sync: boolean = false,
): Record<string, HashpipeFunction> {
    const wo: Record<string, HashpipeFunction> = {}
    for (const [k, f] of Object.entries(o)) {
        if (typeof f === "function") {
            const wrapf = sync ? wraponeSync : wrapone
            wo[pre + k] = wrapf(f, with_inp)
        }
    }
    return wo
}
