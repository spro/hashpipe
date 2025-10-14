import * as xml2js from "xml2js"
import { HashpipeFunction } from "../helpers"

export const xml2js_cmd: HashpipeFunction = (inp, args, ctx, cb) => {
    const parser = new xml2js.Parser()
    parser.parseString(inp, cb as any)
}
