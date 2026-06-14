"use strict";
// Browser stand-in for node:fs, swapped in by esbuild (--alias) when
// bundling web/hashpipe.js. Pipeline.execFile is the only core caller;
// anything reaching these gets a clear error instead of a missing module.
Object.defineProperty(exports, "__esModule", { value: true });
exports.readFileSync = readFileSync;
exports.appendFileSync = appendFileSync;
exports.readFile = readFile;
const message = "File system access is not available in the browser";
function readFileSync(_path) {
    throw new Error(message);
}
function appendFileSync(_path, _data) {
    throw new Error(message);
}
function readFile() {
    throw new Error(message);
}
exports.default = { readFileSync, appendFileSync, readFile };
//# sourceMappingURL=fs.js.map