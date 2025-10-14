import { HashpipeFunction } from "../helpers"

function padded(s: string, n: number = 40): string {
    return make_padding(n - s.length) + s
}

function make_padding(n: number): string {
    return Array(n + 1)
        .fill(" ")
        .join("")
}

function make_histogram(l: any[], x: string = "#"): string {
    const rows: string[] = []
    for (let n of l) {
        let r = ""
        if (typeof n === "object") {
            r = padded(n.item + " ")
            n = n.count
        }
        for (let i = 0; i < n; i++) {
            r += x
        }
        rows.push(r)
    }
    return rows.join("\n")
}

export const histogram: HashpipeFunction = (inp, args, ctx, cb) => {
    cb(null, make_histogram(inp || args[0]))
}
