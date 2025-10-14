import { describe, expect, test } from "vitest"
import builtins from "../src/builtins"
import { runHashpipeFn } from "./helpers"

const noopCtx = {}

describe("collection builtins", () => {
    test("keys returns object keys", async () => {
        const input = { foo: 1, bar: 2 }
        const result = await runHashpipeFn(builtins.keys, input, [], noopCtx)
        expect(result.sort()).toEqual(["bar", "foo"])
    })

    test("groupBy groups by property name", async () => {
        const input = [
            { type: "a", value: 1 },
            { type: "b", value: 2 },
            { type: "a", value: 3 },
        ]
        const result = await runHashpipeFn(
            builtins.groupBy,
            input,
            ["type"],
            noopCtx,
        )
        expect(Object.keys(result)).toEqual(["a", "b"])
        expect(result["a"].map((item: any) => item.value)).toEqual([1, 3])
    })

    test("flatten flattens deeply by default", async () => {
        const input = [1, [2, [3]]]
        const result = await runHashpipeFn(builtins.flatten, input, [], noopCtx)
        expect(result).toEqual([1, 2, 3])
    })
})
