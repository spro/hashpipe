import { BuiltinMap } from "./common"
import { formatDate } from "../utils/date-format"

// Time helpers for scheduling and timestamps.

const timeBuiltins: BuiltinMap = {
    sleep: (inp, args, ctx, cb) => {
        setTimeout(() => cb(null, inp), Number(args[0]))
    },
    now: (inp, args, ctx, cb) => {
        cb(null, new Date())
    },
    timestamp: (inp, args, ctx, cb) => {
        cb(null, new Date().getTime())
    },
    "oid-timestamp": (inp, args, ctx, cb) => {
        const value = (args[0] || inp).toString().substring(0, 8)
        cb(null, parseInt(value, 16) * 1000)
    },
    "format-date": (inp, args, ctx, cb) => {
        const value = inp ?? new Date()
        const pattern = args[0] || "YYYY-MM-DD HH:mm:ss"
        cb(null, formatDate(value, pattern))
    },
}

export default timeBuiltins
