import * as xml2js from "xml2js"
import { HashpipeFunction, command } from "../helpers"

export const xml2js_cmd: HashpipeFunction = command((inp) => {
    const parser = new xml2js.Parser()
    return parser.parseStringPromise(inp)
})
