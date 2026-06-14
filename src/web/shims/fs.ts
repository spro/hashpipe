// Browser stand-in for node:fs, swapped in by esbuild (--alias) when
// bundling web/hashpipe.js. Pipeline.execFile is the only core caller;
// anything reaching these gets a clear error instead of a missing module.

const message = "File system access is not available in the browser"

export function readFileSync(_path: any): never {
    throw new Error(message)
}

export function appendFileSync(_path: any, _data: any): never {
    throw new Error(message)
}

export function readFile(): never {
    throw new Error(message)
}

export default { readFileSync, appendFileSync, readFile }
