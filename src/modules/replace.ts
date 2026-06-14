import { HashpipeFunction, command } from "../helpers"

export const replace: HashpipeFunction = command((inp, args) =>
    inp.replace(args[0], args[1]),
)
