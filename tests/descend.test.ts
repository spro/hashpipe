import { test, expect } from "vitest"
import { at } from "../lib/pipeline"
import { _inspect } from "./helpers"

const test_input = {
    name: "jones",
    favorites: {
        animal: "walrus",
        color: "chartreuse",
    },
    things: [
        [
            { name: "james", type: "friend" },
            { name: "joe", type: "friend" },
        ],
        [{ name: "apple", type: "food" }],
    ],
}

const expr = [{ get: "things" }, { map: "type", depth: 2 }]

const expected_result = [["friend", "friend"], ["food"]]

test("descend_test - deeply nested array traversal", async () => {
    const result = await new Promise((resolve, reject) => {
        at(test_input, expr, {}, (err: any, test_result: any) => {
            if (err) {
                reject(err)
            } else {
                resolve(test_result)
            }
        })
    })

    console.log("\nResult:\n", _inspect(result))

    expect(result).toEqual(expected_result)
})
