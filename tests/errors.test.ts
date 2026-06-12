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
