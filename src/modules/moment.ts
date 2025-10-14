import moment from "moment"
import { HashpipeFunction } from "../helpers"

export const format_date: HashpipeFunction = (inp, args, ctx, cb) => {
    cb(null, moment(inp).format(args[0]))
}
