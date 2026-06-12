// Browser entry point, bundled by esbuild (npm run build-web) into
// web/hashpipe.js and exposed as the global `Hashpipe`. Runs the same
// parser, pipeline, and builtins as the node REPL; node-only modules are
// replaced by fetch-backed equivalents below.

import { Pipeline, Scope } from "../pipeline"
import { Lambda } from "../helpers"
import { HelpPage } from "../builtins/help"
import type { Callback, HashpipeFunction } from "../helpers"

// fetch-backed analog of the node http module. The url is the first
// argument, or the piped input if no argument is given; a missing scheme
// defaults to https. Non-GET methods send the piped input as a JSON body.
// Responses parse as JSON when possible, falling back to text.

function httpCommand(method: string): HashpipeFunction {
    return (inp, args, ctx, cb) => {
        let url = args.length ? String(args[0]) : inp
        if (typeof url !== "string" || !url.length) {
            return cb(method.toLowerCase() + ": no url given")
        }
        if (!/^https?:\/\//.test(url)) url = "https://" + url
        const init: RequestInit = { method }
        if (method !== "GET" && inp != null) {
            init.body = typeof inp === "string" ? inp : JSON.stringify(inp)
            init.headers = { "content-type": "application/json" }
        }
        fetch(url, init)
            .then(async (res) => {
                const text = await res.text()
                let data: any = text
                try {
                    data = JSON.parse(text)
                } catch {
                    // leave as text
                }
                if (!res.ok) return cb("HTTP " + res.status + " for " + url)
                cb(null, data)
            })
            .catch((err) => cb(String(err)))
    }
}

const http: Record<string, HashpipeFunction> = {}
for (const method of ["get", "post", "put", "delete"]) {
    http[method] = httpCommand(method.toUpperCase())
    http["http." + method] = http[method]
}

const webModules: Record<string, Record<string, HashpipeFunction>> = { http }

// Mirrors the node PipelineREPL: one persistent context across commands,
// with the last output piped into the next command as input.

export class WebShell {
    pipeline: Pipeline
    context: Scope
    last_out: any = null

    constructor() {
        this.pipeline = new Pipeline()

        // `use <name>` resolves through require() in node; here it resolves
        // against the fetch-backed web modules instead.
        const nodeUse = this.pipeline.use.bind(this.pipeline)
        this.pipeline.use = ((fns: any) => {
            if (typeof fns === "string") {
                const mod = webModules[fns]
                if (!mod) {
                    throw new Error(
                        "module '" + fns + "' is not available in the browser",
                    )
                }
                return nodeUse(mod)
            }
            return nodeUse(fns)
        }) as Pipeline["use"]

        this.pipeline.use("http")
        this.context = this.pipeline.subScope()
    }

    exec(script: string, cb: Callback): void {
        try {
            this.pipeline.exec(
                script,
                this.last_out,
                this.context,
                (err, data) => {
                    this.last_out = data
                    cb(err, data)
                },
            )
        } catch (e) {
            cb(String(e))
        }
    }
}

export { Pipeline, Scope, Lambda, HelpPage }
