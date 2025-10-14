import * as fs from "fs"
import * as path from "path"
import { HashpipeFunction } from "../helpers"

function resolvePath(string: string): string {
    if (string.substr(0, 1) === "~") {
        string = process.env.HOME + string.substr(1)
    }
    return path.resolve(string)
}

// cat "filename" -> "file"
export const cat: HashpipeFunction = (inp, args, ctx, cb) => {
    const filename = resolvePath(args[0])
    fs.readFile(filename, (err, buffer) => {
        if (err) return cb(err)
        cb(null, buffer.toString())
    })
}

// cat-stream "filename" -> {file}
export const cat_stream: HashpipeFunction = (inp, args, ctx, cb) => {
    const filename = resolvePath(args[0])
    cb(null, fs.createReadStream(filename))
}

// "file" -> write "filename" -> "file"
export const write: HashpipeFunction = (inp, args, ctx, cb) => {
    const filename = resolvePath(args[0])
    fs.writeFile(filename, inp, (err) => {
        if (err) return cb(err)
        cb(null, inp)
    })
}

// ls "dir?" -> ["filename"]
export const ls: HashpipeFunction = (inp, args, ctx, cb) => {
    const filename = resolvePath(args[0] || ".")
    fs.readdir(filename, (err, filenames) => {
        if (err) return cb(err)
        const filtered = filenames.filter((f) => f[0] !== ".")
        const files = filtered.filter((subfilename) => {
            return fs.lstatSync(path.join(filename, subfilename)).isFile()
        })
        const dirs = filtered.filter((subfilename) => {
            return fs.lstatSync(path.join(filename, subfilename)).isDirectory()
        })
        cb(null, { dirs, files })
    })
}

// cd "dir" -> success
export const cd: HashpipeFunction = (inp, args, ctx, cb) => {
    const dirname = resolvePath(args[0] || process.env.HOME || "")
    process.chdir(dirname)
    cb(null)
}
