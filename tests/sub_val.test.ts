import { test, expect } from "vitest"
import { Pipeline } from "../src/pipeline"
import { _inspect, execPipeline, showParsed } from "./helpers"

// Test input data
const test_input = [
    {
        name: "bill",
        dogs: [
            {
                name: "sparky",
                age: 58,
            },
            {
                name: "woofer",
                age: 6,
            },
        ],
    },
    {
        name: "fred",
        dogs: [],
    },
]

const pipe = new Pipeline()
const test_ctx = pipe.subScope()

const execScript = (cmd: string) =>
    execPipeline(pipe, cmd, { input: test_input, ctx: test_ctx })

test("sub_val - sub-command in object value position", async () => {
    const cmd = `
    id @ :{
      name,
      dog_years: $(@dogs:age | + 0)
    }
  `

    showParsed(cmd)

    const result = await execScript(cmd)

    console.log("\nResult:\n", _inspect(result))

    const expected = [
        {
            name: "bill",
            dog_years: 64,
        },
        {
            name: "fred",
            dog_years: 0,
        },
    ]

    console.log("\nExpected:\n", _inspect(expected))

    expect(result).toEqual(expected)
})
