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
const path = __importStar(require("path"));
function resolvePath(string) {
    if (string.substr(0, 1) === "~") {
        string = process.env.HOME + string.substr(1);
    }
    return path.resolve(string);
}
// cat "filename" -> "file"
const cat = (inp, args, ctx, cb) => {
    const filename = resolvePath(args[0]);
    fs.readFile(filename, (err, buffer) => {
        if (err)
            return cb(err);
        cb(null, buffer.toString());
    });
};
exports.cat = cat;
// cat-stream "filename" -> {file}
const cat_stream = (inp, args, ctx, cb) => {
    const filename = resolvePath(args[0]);
    cb(null, fs.createReadStream(filename));
};
exports.cat_stream = cat_stream;
// "file" -> write "filename" -> "file"
const write = (inp, args, ctx, cb) => {
    const filename = resolvePath(args[0]);
    fs.writeFile(filename, inp, (err) => {
        if (err)
            return cb(err);
        cb(null, inp);
    });
};
exports.write = write;
// ls "dir?" -> ["filename"]
const ls = (inp, args, ctx, cb) => {
    const filename = resolvePath(args[0] || ".");
    fs.readdir(filename, (err, filenames) => {
        if (err)
            return cb(err);
        const filtered = filenames.filter((f) => f[0] !== ".");
        const files = filtered.filter((subfilename) => {
            return fs.lstatSync(path.join(filename, subfilename)).isFile();
        });
        const dirs = filtered.filter((subfilename) => {
            return fs.lstatSync(path.join(filename, subfilename)).isDirectory();
        });
        cb(null, { dirs, files });
    });
};
exports.ls = ls;
// cd "dir" -> success
const cd = (inp, args, ctx, cb) => {
    const dirname = resolvePath(args[0] || process.env.HOME || "");
    process.chdir(dirname);
    cb(null);
};
exports.cd = cd;
//# sourceMappingURL=files.js.map