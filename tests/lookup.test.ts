import { describe, test, expect } from "vitest"
import { Pipeline } from "../src/pipeline"
import { execPipeline } from "./helpers"

// ======================
// SETUP
// ======================

// Shadowing tests register fns on the pipeline root, so each test gets a
// fresh pipeline to avoid cross-contamination.
const execFresh = (cmd: string, input?: any): Promise<any> => {
    const pipe = new Pipeline()
    return execPipeline(pipe, cmd, { input, ctx: pipe.subScope({ vars: {} }) })
}

// ======================
// TESTS
// ======================

describe("command lookup order", () => {
    test("a def shadows a builtin", async () => {
        const result = await execFresh(
            `def upper {| echo shadowed } ; echo hi | upper`,
        )
        expect(result).toEqual("shadowed")
    })

    test("an alias shadows a builtin", async () => {
        const result = await execFresh(
            `alias length = val 999 ; list a b | length`,
        )
        expect(result).toEqual(999)
    })

    test("a module-loaded fn shadows a builtin", async () => {
        const pipe = new Pipeline()
        pipe.use({
            upper: (inp: any, args: any[], ctx: any, cb: any) =>
                cb(null, "from-module"),
        })
        const result = await execPipeline(pipe, `echo hi | upper`, {
            ctx: pipe.subScope({ vars: {} }),
        })
        expect(result).toEqual("from-module")
    })

    test("builtin reaches the original under a shadow", async () => {
        const result = await execFresh(
            `def upper {| echo shadowed } ; echo hi | builtin upper`,
        )
        expect(result).toEqual("HI")
    })

    test("unshadowed builtins resolve as before", async () => {
        expect(await execFresh(`echo hi | upper`)).toEqual("HI")
    })
})

describe("which", () => {
    test("reports a builtin", async () => {
        expect(await execFresh(`which upper`)).toEqual({
            command: "upper",
            type: "builtin",
        })
    })

    test("reports a def with its source", async () => {
        const result = await execFresh(`def shout {| upper } ; which shout`)
        expect(result).toEqual({
            command: "shout",
            type: "def",
            src: "{| upper }",
        })
    })

    test("reports an alias with its source", async () => {
        const result = await execFresh(`alias yell = echo loud ; which yell`)
        expect(result).toEqual({
            command: "yell",
            type: "alias",
            src: "echo loud",
        })
    })

    test("reports when a name shadows a builtin", async () => {
        const result = await execFresh(
            `def upper {| echo shadowed } ; which upper`,
        )
        expect(result).toEqual({
            command: "upper",
            type: "def",
            src: "{| echo shadowed }",
            shadows: "builtin",
        })
    })

    test("errors for unknown names", async () => {
        await expect(execFresh(`which no-such-command`)).rejects.toMatch(
            /No command/,
        )
    })
})
