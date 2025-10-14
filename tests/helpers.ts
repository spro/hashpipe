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
): Promise<any> =>
    new Promise((resolve, reject) => {
        fn(input, args, ctx, (err, result) => {
            if (err) reject(err)
            else resolve(result)
        })
    })

export const execPipeline = (
    pipe: any,
    script: string,
    { input, ctx }: ExecOptions = {},
): Promise<any> =>
    new Promise((resolve, reject) => {
        const done = (err: any, result: any) => {
            if (err) reject(err)
            else resolve(result)
        }

        if (ctx !== undefined) {
            pipe.exec(script, input, ctx, done)
        } else if (input !== undefined) {
            pipe.exec(script, input, done)
        } else {
            pipe.exec(script, done)
        }
    })
