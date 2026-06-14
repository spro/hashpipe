import { BuiltinMap } from "./common"
import { command } from "../helpers"
import { formatDate } from "../utils/date-format"

// Time helpers for scheduling and timestamps.

const timeBuiltins: BuiltinMap = {
    sleep: command(
        (inp, args) =>
            new Promise((resolve) => {
                setTimeout(() => resolve(inp), Number(args[0]))
            }),
    ),
    now: command(() => new Date()),
    timestamp: command(() => new Date().getTime()),
    "oid-timestamp": command((inp, args) => {
        const value = (args[0] || inp).toString().substring(0, 8)
        return parseInt(value, 16) * 1000
    }),
    "format-date": command((inp, args) => {
        const value = inp ?? new Date()
        const pattern = args[0] || "YYYY-MM-DD HH:mm:ss"
        return formatDate(value, pattern)
    }),
}

export default timeBuiltins
