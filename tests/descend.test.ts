import { test, expect } from "vitest"
import { at } from "../src/pipeline"
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
    const result = await at(test_input, expr, {} as any)

    console.log("\nResult:\n", _inspect(result))

    expect(result).toEqual(expected_result)
})
