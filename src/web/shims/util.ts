// Browser stand-in for node:util, swapped in by esbuild (--alias) when
// bundling web/hashpipe.js. Provides just enough of inspect for Lambda
// display and the debug builtins. The custom symbol matches node's
// (Symbol.for), so classes compiled against the real util still work.

const custom: symbol = Symbol.for("nodejs.util.inspect.custom")

function inspectValue(value: any, seen: Set<any>): string {
    if (value === null) return "null"
    if (value === undefined) return "undefined"
    const t = typeof value
    if (t === "string") return "'" + value + "'"
    if (t === "function") return "[Function: " + (value.name || "anonymous") + "]"
    if (t !== "object") return String(value)
    if (typeof value[custom] === "function") return value[custom]()
    if (seen.has(value)) return "[Circular]"
    seen.add(value)
    if (Array.isArray(value)) {
        if (!value.length) return "[]"
        return "[ " + value.map((v) => inspectValue(v, seen)).join(", ") + " ]"
    }
    const entries = Object.entries(value).map(
        ([k, v]) => k + ": " + inspectValue(v, seen),
    )
    return entries.length ? "{ " + entries.join(", ") + " }" : "{}"
}

export const inspect = Object.assign(
    (value: any, _options?: any): string => inspectValue(value, new Set()),
    { custom },
)

export default { inspect }
