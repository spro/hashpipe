import { inspect } from "util"
import type { BuiltinMap } from "./common"
import core from "./core"
import math from "./math"
import strings from "./strings"
import collections from "./collections"
import json from "./json"
import debug from "./debug"
import random from "./random"
import time from "./time"
import environment from "./environment"

// The `help` command returns a HelpPage value. Each frontend presents it
// its own way: the terminal pretty-printer hits [inspect.custom] and gets
// formatted text, while the web repl detects the instance and renders the
// examples as clickable chips.

export interface HelpExample {
    cmd: string
    note: string
}

export interface HelpSection {
    title: string
    lines?: string[]
    examples?: HelpExample[]
}

const DOCS_URL =
    "https://github.com/spro/hashpipe/blob/master/docs/Syntax.md"

export class HelpPage {
    constructor(
        public title: string,
        public sections: HelpSection[],
        public docs: string = DOCS_URL,
    ) {}

    text(): string {
        const out: string[] = [this.title, ""]
        for (const section of this.sections) {
            out.push(section.title)
            for (const line of section.lines || []) {
                out.push("  " + line)
            }
            const examples = section.examples || []
            const width = Math.min(
                48,
                Math.max(0, ...examples.map((e) => e.cmd.length)),
            )
            for (const ex of examples) {
                out.push("  " + ex.cmd.padEnd(width) + "  # " + ex.note)
            }
            out.push("")
        }
        out.push("Full syntax guide: " + this.docs)
        return out.join("\n")
    }

    toString(): string {
        return this.text()
    }

    toJSON(): string {
        return this.text()
    }

    [inspect.custom](): string {
        return this.text()
    }
}

const categories: [string, BuiltinMap][] = [
    ["core", core],
    ["math", math],
    ["strings", strings],
    ["collections", collections],
    ["json", json],
    ["debug", debug],
    ["random", random],
    ["time", time],
    ["environment", environment],
]

function commandLines(ctx: any): string[] {
    const lines = categories.map(
        ([name, map]) => name.padEnd(13) + Object.keys(map).sort().join(" "),
    )
    try {
        const loaded = Object.keys(ctx.topScope().fns || {}).sort()
        if (loaded.length) {
            lines.push("loaded".padEnd(13) + loaded.join(" "))
        }
    } catch {
        // no scope chain available; skip the loaded line
    }
    return lines
}

function buildHelpPage(ctx: any): HelpPage {
    return new HelpPage("hashpipe — a JSON shell", [
        {
            title: "Pipes",
            examples: [
                {
                    cmd: "echo one two three | split ' '",
                    note: "pipe output into the next command",
                },
                {
                    cmd: "[1, 2, 3, 4] || * 5",
                    note: "parallel pipe: map over a list",
                },
                {
                    cmd: "list 1 2 3 |= + 1",
                    note: "series pipe: map one at a time",
                },
            ],
        },
        {
            title: "Values and variables",
            examples: [
                {
                    cmd: '{name: "Fred", age: 42}',
                    note: "JSON literals are values",
                },
                {
                    cmd: "$x = 6 ; $x * 7",
                    note: "variables and infix expressions",
                },
                {
                    cmd: "list a b c | length | echo counted $!",
                    note: "$! is the last output",
                },
            ],
        },
        {
            title: "At-expressions",
            examples: [
                {
                    cmd: '{name: "Fred", age: 42} @ name',
                    note: "get a key",
                },
                {
                    cmd: "[{n: 1}, {n: 2}, {n: 3}] @ :n",
                    note: "map a key over a list",
                },
                {
                    cmd: '{name: "Fred", age: 42} @ {who: name}',
                    note: "pluck into a new shape",
                },
            ],
        },
        {
            title: "Functions",
            examples: [
                {
                    cmd: "5 | {| * 2 }",
                    note: "a lambda is a pipeline in a box",
                },
                {
                    cmd: "def dog-years { $n | $n * 7 } ; dog-years 6",
                    note: "define named commands",
                },
                {
                    cmd: "[1, 2, 3] | map {| * 10 }",
                    note: "higher-order commands take lambdas",
                },
                {
                    cmd: "[{age: 58}, {age: 6}] | filter {| $(@ age) > 30 }",
                    note: "comparisons make predicates",
                },
            ],
        },
        {
            title: "HTTP",
            examples: [
                {
                    cmd: "http.get https://api.github.com/repos/spro/hashpipe @ name",
                    note: "fetch JSON from an API",
                },
            ],
        },
        {
            title: "Commands",
            lines: commandLines(ctx),
        },
    ])
}

const helpBuiltins: BuiltinMap = {
    help: (inp, args, ctx, cb) => {
        cb(null, buildHelpPage(ctx))
    },
}

categories.push(["help", helpBuiltins])

export default helpBuiltins
