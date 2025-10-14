import { HashpipeFunction } from "../helpers"

// Encodings and decodings

export const atob: HashpipeFunction = (inp, args, ctx, cb) => {
    const tob = Buffer.from(inp, "base64").toString("binary")
    cb(null, tob)
}

export const btoa: HashpipeFunction = (inp, args, ctx, cb) => {
    let buffer: Buffer

    if (inp instanceof Buffer) {
        buffer = inp
    } else {
        buffer = Buffer.from(inp.toString(), "binary")
    }

    const toa = buffer.toString("base64")
    cb(null, toa)
}
