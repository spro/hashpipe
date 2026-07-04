import { describe, test, expect } from "vitest"
import { Pipeline } from "../src/pipeline"
import { execPipeline } from "./helpers"

// ======================
// SETUP
// ======================

const pipe = new Pipeline()

const test_ctx = pipe.subScope({
    vars: {},
})

const execScript = (cmd: string, input?: any): Promise<any> =>
    execPipeline(pipe, cmd, { input, ctx: test_ctx })

// ======================
// TESTS
// ======================

describe("loud shape errors in at-expressions", () => {
    // Policy: shape mismatches are loud; missing keys stay lenient
    test("map ':' over a non-array raises a shape error", async () => {
        await expect(execScript(`{a: 1} @ :a`)).rejects.toMatch(
            /:a.+expects an array.+object/,
        )
    })

    test("named get on an array suggests the map operator", async () => {
        await expect(execScript(`[{a: 1}, {a: 2}] @ a`)).rejects.toMatch(
            /'a' from an array.+:a/,
        )
    })

    test("slice on a non-sliceable raises a shape error", async () => {
        await expect(execScript(`{a: 1} @ 0..2`)).rejects.toMatch(
            /slice.+expects an array or string.+object/,
        )
    })

    test("map depth ':::' beyond the nesting raises at the offending level", async () => {
        await expect(execScript(`[{a: 1}] @ ::a`)).rejects.toMatch(
            /:a.+expects an array/,
        )
    })

    test("missing keys still read as undefined", async () => {
        expect(await execScript(`{a: 1} @ nope`)).toBeUndefined()
    })

    test("paths through missing keys stay lenient", async () => {
        expect(await execScript(`{a: 1} @ nope.deeper`)).toBeUndefined()
    })

    test("numeric and negative gets on arrays still work", async () => {
        expect(await execScript(`[5, 6, 7] @ -1`)).toEqual(7)
    })

    test("slices on strings still work", async () => {
        expect(await execScript(`"hello" @ 1..3`)).toEqual("el")
    })
})

describe("loud arithmetic", () => {
    test("infix + with non-numeric strings raises instead of yielding 0", async () => {
        await expect(execScript(`"a" + "b"`)).rejects.toMatch(
            /'\+' expects numbers.+"a"/,
        )
    })

    test("numeric strings still coerce in infix", async () => {
        expect(await execScript(`"5" + 1`)).toEqual(6)
    })

    test("the + command raises on non-numeric items", async () => {
        await expect(execScript(`["a", "b"] | +`)).rejects.toMatch(
            /'\+' expects numbers/,
        )
    })

    test("the + command still sums numbers", async () => {
        expect(await execScript(`[1, 2, 3] | +`)).toEqual(6)
    })

    test("ordered comparisons keep string semantics", async () => {
        expect(await execScript(`"b" > "a"`)).toEqual(true)
    })

    test("the '.' concat command is untouched", async () => {
        expect(await execScript(`["a", "b"] | .`)).toEqual("ab")
    })
})

describe("error labeling and structured errors", () => {
    test("runtime errors are not labeled as parse errors", async () => {
        const fresh = new Pipeline()
        await expect(fresh.exec(`no-such-command`)).rejects.not.toMatch(
            /Error parsing pipeline/,
        )
    })

    test("parse errors still get the parse label", async () => {
        const fresh = new Pipeline()
        await expect(fresh.exec(`echo hi |`)).rejects.toMatch(
            /Error parsing pipeline/,
        )
    })

    test("object errors pass through to |? intact", async () => {
        const fresh = new Pipeline().use({
            boomobj: async () => {
                throw { code: 7, why: "shaped" }
            },
        })
        const result = await execPipeline(fresh, `boomobj |? @ code`, {})
        expect(result).toEqual(7)
    })
})

describe("error propagation", () => {
    test("a failed command aborts the pipeline with its own error", async () => {
        await expect(
            execScript(`no-such-command @ description | split ' '`),
        ).rejects.toMatch(/No command/)
    })

    test("a failed command aborts before later stages run", async () => {
        await expect(
            execScript(`no-such-command | set marker yes`),
        ).rejects.toMatch(/No command/)
        const after = await execScript(`$marker`)
        expect(after).toBeUndefined()
    })

    test("a synchronously throwing command becomes a pipeline error", async () => {
        await expect(execScript(`$nope | split ' '`)).rejects.toMatch(
            /Error in command split/,
        )
    })

    test("the pipeline still works after a stage error", async () => {
        await expect(execScript(`$nope | split ' '`)).rejects.toBeTruthy()
        const result = await execScript(`echo recovered | upper`)
        expect(result).toEqual("RECOVERED")
    })
})
