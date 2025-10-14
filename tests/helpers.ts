import { inspect } from "util"
import { parsePipelines } from "../lib/pipeline"

export const _inspect = (o: any) => inspect(o, { depth: null })

export const showParsed = (cmd: string) => {
    console.log(`Parsed "${cmd}" ->`)
    console.log("~~~~~")
    console.log(_inspect(parsePipelines(cmd)))
    console.log("~~~~~\n")
}
