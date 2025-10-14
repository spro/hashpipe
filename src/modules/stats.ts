import * as statistics from "simple-statistics"
import { HashpipeFunction } from "../helpers"

export const linreg: HashpipeFunction = (inp, args, ctx, cb) => {
    cb(null, statistics.linearRegression(inp))
}
