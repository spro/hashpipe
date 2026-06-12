import { describe, test, expect } from "vitest"
import { Pipeline } from "../src/pipeline"
import { execPipeline, showParsed } from "./helpers"

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

describe("pipe operator registry", () => {
    test("standard pipes still work", async () => {
        expect(await execScript(`echo one two | split ' '`)).toEqual([
            "one",
            "two",
        ])
        expect(await execScript(`[1, 2, 3] || * 5`)).toEqual([5, 10, 15])
        expect(await execScript(`[1, 2, 3] |= + 1`)).toEqual([2, 3, 4])
    })

    test("operator characters inside words are not pipes", async () => {
        expect(await execScript(`echo a=b | echo c?d`)).toEqual("c?d")
    })

    test("an unknown operator fails loudly", async () => {
        await expect(execScript(`echo a |^ upper`)).rejects.toMatch(
            /Unknown pipe operator/,
        )
    })
})

describe("error pipe |?", () => {
    test("catches an upstream error as its input", async () => {
        const cmd = `no-such-command |? echo caught: $!`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toMatch(/caught: No command no-such-command/)
    })

    test("recovers with a fallback value", async () => {
        const result = await execScript(`no-such-command |? val fallback`)
        expect(result).toEqual("fallback")
    })

    test("is skipped entirely when nothing failed", async () => {
        const result = await execScript(`echo fine |? echo caught $!`)
        expect(result).toEqual("fine")
    })

    test("downstream stages continue after recovery", async () => {
        const result = await execScript(`no-such-command |? val rescued | upper`)
        expect(result).toEqual("RESCUED")
    })

    test("catches errors from mid-pipeline stages", async () => {
        const result = await execScript(
            `echo hi | no-such-command |? val fallback | upper`,
        )
        expect(result).toEqual("FALLBACK")
    })

    test("uncaught errors still abort", async () => {
        await expect(execScript(`no-such-command | upper`)).rejects.toMatch(
            /No command/,
        )
    })
})
