import * as fs from "fs"
import * as fsp from "fs/promises"
import * as path from "path"
import { HashpipeFunction, command } from "../helpers"

function resolvePath(string: string): string {
    if (string.substr(0, 1) === "~") {
        string = process.env.HOME + string.substr(1)
    }
    return path.resolve(string)
}

// cat "filename" -> "file"
export const cat: HashpipeFunction = command(async (inp, args) => {
    const filename = resolvePath(args[0])
    return (await fsp.readFile(filename)).toString()
})

// cat-stream "filename" -> {file}
export const cat_stream: HashpipeFunction = command((inp, args) => {
    const filename = resolvePath(args[0])
    return fs.createReadStream(filename)
})

// "file" -> write "filename" -> "file"
export const write: HashpipeFunction = command(async (inp, args) => {
    const filename = resolvePath(args[0])
    await fsp.writeFile(filename, inp)
    return inp
})

// ls "dir?" -> ["filename"]
export const ls: HashpipeFunction = command(async (inp, args) => {
    const filename = resolvePath(args[0] || ".")
    const filenames = (await fsp.readdir(filename)).filter((f) => f[0] !== ".")
    const stats = await Promise.all(
        filenames.map(async (subfilename) => ({
            subfilename,
            stat: await fsp.lstat(path.join(filename, subfilename)),
        })),
    )
    const files = stats
        .filter(({ stat }) => stat.isFile())
        .map(({ subfilename }) => subfilename)
    const dirs = stats
        .filter(({ stat }) => stat.isDirectory())
        .map(({ subfilename }) => subfilename)
    return { dirs, files }
})

// cd "dir" -> success
export const cd: HashpipeFunction = command((inp, args) => {
    const dirname = resolvePath(args[0] || process.env.HOME || "")
    process.chdir(dirname)
})
