"use strict";
// Browser entry point, bundled by esbuild (npm run build-web) into
// web/hashpipe.js and exposed as the global `Hashpipe`. Runs the same
// parser, pipeline, and builtins as the node REPL; node-only modules are
// replaced by fetch-backed equivalents below.
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpPage = exports.Lambda = exports.Scope = exports.Pipeline = exports.WebShell = void 0;
const pipeline_1 = require("../pipeline");
Object.defineProperty(exports, "Pipeline", { enumerable: true, get: function () { return pipeline_1.Pipeline; } });
Object.defineProperty(exports, "Scope", { enumerable: true, get: function () { return pipeline_1.Scope; } });
const helpers_1 = require("../helpers");
Object.defineProperty(exports, "Lambda", { enumerable: true, get: function () { return helpers_1.Lambda; } });
const help_1 = require("../builtins/help");
Object.defineProperty(exports, "HelpPage", { enumerable: true, get: function () { return help_1.HelpPage; } });
// fetch-backed analog of the node http module. The url is the first
// argument, or the piped input if no argument is given; a missing scheme
// defaults to https. Non-GET methods send the piped input as a JSON body.
// Responses parse as JSON when possible, falling back to text.
function httpCommand(method) {
    return (0, helpers_1.command)(async (inp, args) => {
        let url = args.length ? String(args[0]) : inp;
        if (typeof url !== "string" || !url.length) {
            throw new Error(method.toLowerCase() + ": no url given");
        }
        if (!/^https?:\/\//.test(url))
            url = "https://" + url;
        const init = { method };
        if (method !== "GET" && inp != null) {
            init.body = typeof inp === "string" ? inp : JSON.stringify(inp);
            init.headers = { "content-type": "application/json" };
        }
        const res = await fetch(url, init);
        const text = await res.text();
        let data = text;
        try {
            data = JSON.parse(text);
        }
        catch {
            // leave as text
        }
        if (!res.ok) {
            // Structured, pipeable error matching the node http module:
            // |? receives it as input, so `|? @ status` works
            throw {
                error: "HTTP " +
                    res.status +
                    (res.statusText ? " " + res.statusText : "") +
                    " from " +
                    url,
                status: res.status,
                statusText: res.statusText,
                url: url,
                body: data,
            };
        }
        return data;
    });
}
const http = {};
for (const method of ["get", "post", "put", "delete"]) {
    http[method] = httpCommand(method.toUpperCase());
    http["http." + method] = http[method];
}
const webModules = { http };
// Mirrors the node PipelineREPL: one persistent context across commands,
// with the last output piped into the next command as input.
class WebShell {
    constructor() {
        this.last_out = null;
        this.pipeline = new pipeline_1.Pipeline();
        // `use <name>` resolves through require() in node; here it resolves
        // against the fetch-backed web modules instead.
        const nodeUse = this.pipeline.use.bind(this.pipeline);
        this.pipeline.use = ((fns) => {
            if (typeof fns === "string") {
                const mod = webModules[fns];
                if (!mod) {
                    throw new Error("module '" + fns + "' is not available in the browser");
                }
                return nodeUse(mod);
            }
            return nodeUse(fns);
        });
        this.pipeline.use("http");
        this.context = this.pipeline.subScope();
    }
    async exec(script) {
        const data = await this.pipeline.exec(script, this.last_out, this.context);
        this.last_out = data;
        return data;
    }
}
exports.WebShell = WebShell;
//# sourceMappingURL=index.js.map