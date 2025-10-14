import { test, expect } from "vitest"
import { Pipeline } from "../lib/pipeline"
import { _inspect, showParsed } from "./helpers"

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

const execTest = (cmd: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        pipe.exec(cmd, {}, test_ctx, (err: any, result: any) => {
            if (err) reject(err)
            else resolve(result)
        })
    })
}

for (const [test_name, test_data] of Object.entries(tests)) {
    test(test_name, async () => {
        showParsed(test_data.cmd)
        const result = await execTest(test_data.cmd)

        console.log("\nResult:\n", _inspect(result))

        expect(result).toEqual(test_data.expected)
    })
}
