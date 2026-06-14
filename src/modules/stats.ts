import * as statistics from "simple-statistics"
import { HashpipeFunction, command } from "../helpers"

export const linreg: HashpipeFunction = command((inp) =>
    statistics.linearRegression(inp),
)
