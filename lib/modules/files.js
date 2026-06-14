"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cd = exports.ls = exports.write = exports.cat_stream = exports.cat = void 0;
const fs = __importStar(require("fs"));
const fsp = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const helpers_1 = require("../helpers");
function resolvePath(string) {
    if (string.substr(0, 1) === "~") {
        string = process.env.HOME + string.substr(1);
    }
    return path.resolve(string);
}
// cat "filename" -> "file"
exports.cat = (0, helpers_1.command)(async (inp, args) => {
    const filename = resolvePath(args[0]);
    return (await fsp.readFile(filename)).toString();
});
// cat-stream "filename" -> {file}
exports.cat_stream = (0, helpers_1.command)((inp, args) => {
    const filename = resolvePath(args[0]);
    return fs.createReadStream(filename);
});
// "file" -> write "filename" -> "file"
exports.write = (0, helpers_1.command)(async (inp, args) => {
    const filename = resolvePath(args[0]);
    await fsp.writeFile(filename, inp);
    return inp;
});
// ls "dir?" -> ["filename"]
exports.ls = (0, helpers_1.command)(async (inp, args) => {
    const filename = resolvePath(args[0] || ".");
    const filenames = (await fsp.readdir(filename)).filter((f) => f[0] !== ".");
    const stats = await Promise.all(filenames.map(async (subfilename) => ({
        subfilename,
        stat: await fsp.lstat(path.join(filename, subfilename)),
    })));
    const files = stats
        .filter(({ stat }) => stat.isFile())
        .map(({ subfilename }) => subfilename);
    const dirs = stats
        .filter(({ stat }) => stat.isDirectory())
        .map(({ subfilename }) => subfilename);
    return { dirs, files };
});
// cd "dir" -> success
exports.cd = (0, helpers_1.command)((inp, args) => {
    const dirname = resolvePath(args[0] || process.env.HOME || "");
    process.chdir(dirname);
});
//# sourceMappingURL=files.js.map