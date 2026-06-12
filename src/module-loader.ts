// Resolves `use <name>` requests against the module search path:
//
//   1. explicit paths (./x, /x, ~/x) against the working directory
//   2. each directory in HASHPIPE_PATH (colon-separated)
//   3. ~/.hashpipe/modules/
//   4. the bundled modules directory (lib/modules)
//   5. the npm package hashpipe-<name>, resolved from the working
//      directory so a local node_modules works. Generic package names
//      are deliberately not tried.
//
// Node builtins are required lazily inside the function so the browser
// bundle (which replaces string `use` entirely) never touches them.

export interface LoadedModule {
    exports: Record<string, any>
    location: string
}

export function loadModule(request: string): LoadedModule {
    const path = require("path")
    const os = require("os")
    const fs = require("fs")
    const { createRequire } = require("module")

    const attempted: string[] = []

    const expand = (p: string): string =>
        p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p

    // A miss is "this module doesn't exist"; a module that exists but
    // fails while loading (e.g. its own missing dependency) rethrows
    const isMissing = (e: any, id: string): boolean => {
        const msg = String((e && e.message) || e)
        const notFound =
            (e &&
                (e.code === "MODULE_NOT_FOUND" ||
                    e.code === "ERR_MODULE_NOT_FOUND")) ||
            msg.includes("Cannot find module")
        return notFound && msg.includes(id)
    }

    // Try a filesystem location with node-style extension fallbacks
    const tryFile = (base: string): LoadedModule | null => {
        const candidates = [
            base,
            base + ".js",
            base + ".cjs",
            base + ".ts",
            path.join(base, "index.js"),
        ]
        for (const candidate of candidates) {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                return { exports: require(candidate), location: candidate }
            }
        }
        attempted.push(base)
        return null
    }

    const miss = (): never => {
        throw new Error(
            `Module '${request}' not found. Tried: ${attempted.join(", ")}`,
        )
    }

    // 1. Explicit paths resolve against the working directory
    if (/^[.~/]/.test(request)) {
        const found = tryFile(path.resolve(process.cwd(), expand(request)))
        if (found) return found
        return miss()
    }

    // 2. HASHPIPE_PATH directories, then 3. ~/.hashpipe/modules
    const dirs = (process.env.HASHPIPE_PATH || "").split(":").filter(Boolean)
    dirs.push(path.join(os.homedir(), ".hashpipe", "modules"))
    for (const dir of dirs) {
        const found = tryFile(path.resolve(expand(dir), request))
        if (found) return found
    }

    // 4. The bundled modules directory
    const bundled = "./modules/" + request
    try {
        return { exports: require(bundled), location: bundled }
    } catch (e: any) {
        if (!isMissing(e, bundled) && !isMissing(e, request)) throw e
        attempted.push("<bundled>" + bundled.slice(1))
    }

    // 5. npm, hashpipe-prefixed names only
    const pkg = "hashpipe-" + request
    try {
        const cwdRequire = createRequire(
            path.join(process.cwd(), "package.json"),
        )
        const location = cwdRequire.resolve(pkg)
        return { exports: cwdRequire(location), location }
    } catch (e: any) {
        if (!isMissing(e, pkg)) throw e
        attempted.push(pkg)
    }

    return miss()
}
