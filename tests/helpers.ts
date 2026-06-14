import { inspect } from "util"
import { parsePipelines } from "../src/pipeline"
import type { HashpipeFunction } from "../src/helpers"

interface ExecOptions {
    input?: any
    ctx?: any
}

export const _inspect = (o: any) => inspect(o, { depth: null })

export const showParsed = (cmd: string) => {
    console.log(`Parsed "${cmd}" ->`)
    console.log("~~~~~")
    console.log(_inspect(parsePipelines(cmd)))
    console.log("~~~~~\n")
}

export const runHashpipeFn = (
    fn: HashpipeFunction,
    input: any,
    args: any[] = [],
    ctx: any = {},
): Promise<any> => Promise.resolve(fn(input, args, ctx))

export const execPipeline = (
    pipe: any,
    script: string,
    { input, ctx }: ExecOptions = {},
): Promise<any> => {
    if (ctx !== undefined) {
        return pipe.exec(script, input, ctx)
    }
    if (input !== undefined) {
        return pipe.exec(script, input)
    }
    return pipe.exec(script)
}
