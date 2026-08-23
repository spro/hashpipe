import { describe, expect, test } from "vitest"
import builtins from "../src/builtins"
import { runHashpipeFn } from "./helpers"

describe("time builtins", () => {
    test("format-date applies default pattern when none given", async () => {
        const fixed = new Date("2024-01-15T10:30:00Z")
        const result = await runHashpipeFn(
            builtins["format-date"],
            fixed,
            [],
            {},
        )
        expect(result).toBe(
            await runHashpipeFn(
                builtins["format-date"],
                fixed,
                ["YYYY-MM-DD HH:mm:ss"],
                {},
            ),
        )
    })

    test("format-date respects provided pattern", async () => {
        const result = await runHashpipeFn(
            builtins["format-date"],
            "2024-01-15T10:30:00Z",
            ["YYYY-MM-DD"],
            {},
        )
        expect(result).toBe("2024-01-15")
    })

    test("format-date treats bracketed text as literals", async () => {
        const result = await runHashpipeFn(
            builtins["format-date"],
            "2024-01-15T10:30:00Z",
            ["YYYY[年]MM[月]DD [HH:mm]"],
            {},
        )
        expect(result).toBe("2024年01月15 HH:mm")
    })
})
