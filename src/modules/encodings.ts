import { HashpipeFunction, command } from "../helpers"

// Encodings and decodings

export const atob: HashpipeFunction = command((inp) =>
    Buffer.from(inp, "base64").toString("binary"),
)

export const btoa: HashpipeFunction = command((inp) => {
    let buffer: Buffer

    if (inp instanceof Buffer) {
        buffer = inp
    } else {
        buffer = Buffer.from(inp.toString(), "binary")
    }

    return buffer.toString("base64")
})
