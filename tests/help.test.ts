import { describe, test, expect } from "vitest"
import { Pipeline } from "../src/pipeline"
import { HelpPage } from "../src/builtins/help"
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

describe("help", () => {
    test("help returns a HelpPage that formats as text", async () => {
        const result = await execScript(`help`)
        expect(result).toBeInstanceOf(HelpPage)
        const text = String(result)
        expect(text).toContain("Pipes")
        expect(text).toContain("def dog-years")
        expect(text).toContain("Full syntax guide")
    })

    test("help lists builtin commands by category", async () => {
        const result = await execScript(`help`)
        const commands = result.sections.find(
            (s: any) => s.title === "Commands",
        )
        expect(commands).toBeTruthy()
        const all = commands.lines.join("\n")
        expect(all).toContain("split")
        expect(all).toContain("filter")
        expect(all).toContain("help")
    })

    test("every help example actually runs", async () => {
        const page: HelpPage = await execScript(`help`)
        for (const section of page.sections) {
            // The HTTP example needs the network and a loaded module
            if (section.title === "HTTP") continue
            for (const example of section.examples || []) {
                await expect(
                    execScript(example.cmd),
                    `help example failed: ${example.cmd}`,
                ).resolves.toBeDefined()
            }
        }
    })
})
