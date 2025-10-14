import { HashpipeFunction } from "../helpers"

export const replace: HashpipeFunction = (inp, args, ctx, cb) => {
    cb(null, inp.replace(args[0], args[1]))
}
