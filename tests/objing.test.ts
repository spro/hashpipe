import { test, expect } from "vitest"
import { Pipeline } from "../src/pipeline"
import { _inspect, execPipeline, showParsed } from "./helpers"

const pipe = new Pipeline().use("keywords") // for slugify

const test_ctx = pipe.subScope({
    vars: {
        hi: "hello",
        cheese: "fromage",
        george: {
            name: "Gregory",
        },
    },
})

interface TestCase {
    cmd: string
    expected: any
}

const tests: Record<string, TestCase> = {
    single_obj: {
        cmd: `{name: "joe"}`,
        expected: { name: "joe" },
    },
    nested_obj: {
        cmd: `{name: {lang: 'en', value: "Joe"}}`,
        expected: { name: { lang: "en", value: "Joe" } },
    },
    obj_at: {
        cmd: `{name: "fred"} @ name`,
        expected: "fred",
    },
}

const execScript = (cmd: string): Promise<any> =>
    execPipeline(pipe, cmd, { input: {}, ctx: test_ctx })

for (const [test_name, test_data] of Object.entries(tests)) {
    test(test_name, async () => {
        showParsed(test_data.cmd)
        const result = await execScript(test_data.cmd)

        console.log("\nResult:\n", _inspect(result))

        expect(result).toEqual(test_data.expected)
    })
}
