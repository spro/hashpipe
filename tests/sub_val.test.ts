import { test, expect } from "vitest"
import { Pipeline, parsePipelines } from "../lib/pipeline"
import { _inspect, showParsed } from "./helpers"

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

test("sub_val - sub-command in object value position", async () => {
    const cmd = `
    id @ :{
      name,
      dog_years: $(@dogs:age | + 0)
    }
  `

    showParsed(cmd)

    const result = await new Promise((resolve, reject) => {
        pipe.exec(cmd, test_input, test_ctx, (err: any, test_result: any) => {
            if (err) {
                console.log("ERROR:", err)
                reject(err)
            } else {
                resolve(test_result)
            }
        })
    })

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
