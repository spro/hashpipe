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
    var_in_obj_template: {
        cmd: `{a: 1} @ {a, x: $hi}`,
        expected: { a: 1, x: "hello" },
    },
    var_in_obj_template_keeps_type: {
        cmd: `{a: 1} @ {who: $george}`,
        expected: { who: { name: "Gregory" } },
    },
    var_with_path_in_template: {
        cmd: `{a: 1} @ {x: $george.name}`,
        expected: { x: "Gregory" },
    },
    var_in_array_template: {
        cmd: `{a: 1} @ [a, $cheese]`,
        expected: [1, "fromage"],
    },
    input_var_in_template: {
        cmd: `{a: 1} @ {self: $!, a}`,
        expected: { self: { a: 1 }, a: 1 },
    },
    var_in_mapped_template: {
        cmd: `[{id: 1}, {id: 2}] @ :{id, tag: $hi}`,
        expected: [
            { id: 1, tag: "hello" },
            { id: 2, tag: "hello" },
        ],
    },
    var_in_nested_template: {
        cmd: `{a: 1} @ {outer: {x: $hi}}`,
        expected: { outer: { x: "hello" } },
    },
    subpipe_var_in_template_still_works: {
        cmd: `{a: 1} @ {x: $($hi)}`,
        expected: { x: "hello" },
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
