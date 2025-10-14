import { describe, test, expect } from "vitest"
import { Pipeline } from "../lib/pipeline"
import { _inspect, execPipeline, showParsed } from "./helpers"

// ======================
// INPUT DATA
// ======================

const test_input = [
    {
        name: "bill",
        dogs: [
            {
                name: "sparky",
                age: 58,
            },
            {
                name: "woofer",
                age: 6,
            },
        ],
    },
    {
        name: "fred",
        dogs: [],
    },
]

const pipe = new Pipeline().use("keywords") // for slugify

const test_ctx = pipe.subScope({
    vars: {
        hi: "hello",
        world: "earth",
        cheese: "fromage",
        george: {
            name: "Gregory",
        },
    },
})

// ======================
// TEST UTILITIES
// ======================

// Helper to run pipeline and return promise
const execScript = (cmd: string): Promise<any> =>
    execPipeline(pipe, cmd, { input: test_input, ctx: test_ctx })

// ======================
// TESTS
// ======================

describe("Hashpipe Pipeline Tests", () => {
    test("first - basic sub-command", async () => {
        const cmd = `obj name joe | echo $( @ name )`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual("joe")
    })

    test("sub_pipe - nested sub-commands", async () => {
        const cmd = `echo $(@ 0.name | . $(echo chee | . se) )`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual("billcheese")
    })

    test("sub_val - sub-command as object value", async () => {
        const cmd = `
          id @ :{
            name,
            dog_years: $(@dogs:age | + 0)
          }
        `
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual([
            {
                name: "bill",
                dog_years: 64,
            },
            {
                name: "fred",
                dog_years: 0,
            },
        ])
    })

    test("sub_key - sub-command as object key", async () => {
        const cmd = `echo "Howdy, Earth!" @ {$( keywords.slugify ): .}`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual({
            "howdy-earth": "Howdy, Earth!",
        })
    })

    test("sub_key_val - sub-command as both key and value", async () => {
        const cmd = `echo "Howdy, Earth!" @ {$(echo phrase): {$( keywords.slugify ): .}}`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual({
            phrase: {
                "howdy-earth": "Howdy, Earth!",
            },
        })
    })

    test("spipe - series pipe", async () => {
        const cmd = `list 4 5 6 |= + 5`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual([9, 10, 11])
    })

    test("sub_var - variable substitution", async () => {
        const cmd = `echo $hi`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual("hello")
    })

    test("multi_sub_var - multiple variable substitution", async () => {
        const cmd = `echo "$hi $world"`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual("hello earth")
    })

    test("escd_quoted - escaped characters with variables", async () => {
        const cmd = `echo "\\)=$cheese"`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual(")=fromage")
    })

    test("vars - setting and using variables", async () => {
        const cmd = `$frank = 5 ; echo $frank`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual("5")
    })

    test("obj_cmd - object literal command", async () => {
        const cmd = `{test: 'ok'}`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual({ test: "ok" })
    })

    test("obj_vars - object variables with @-expressions", async () => {
        const cmd = `$fred = {name: "Fred"} ; echo $( $fred @ name )`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual("Fred")
    })

    test("parse_bool - boolean parsing", async () => {
        const cmd = `true`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual(true)
    })

    test("dont_parse_bool - non-boolean string", async () => {
        const cmd = `trueth`
        showParsed(cmd)
        // This command doesn't exist, so it should fail
        await expect(execScript(cmd)).rejects.toThrow()
    })

    test("list_cmd - raw list syntax with @-expressions", async () => {
        const cmd = `[1, 2, [3, 4]] @ 2.1`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual(4)
    })

    test("list_objs - lists and objects combined", async () => {
        const cmd = `[{name: "Jeorge", age: 55}, {name: "Fredrick", pets: ['Kangaroo', 'Dog']}] @ 1.pets.1 | reverse`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual("goD")
    })

    test("set_alias - setting alias", async () => {
        const cmd = `alias sayhi = echo "hello there"`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual({
            success: true,
            alias: "sayhi",
            script: 'echo "hello there"',
        })
    })

    test("use_alias - using alias", async () => {
        const cmd = `sayhi`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        expect(result).toEqual("hello there")
    })

    test("test_ppipe - parallel piping", async () => {
        const cmd = `range 25 || obj id $! || id @ id`
        showParsed(cmd)
        const result = await execScript(cmd)
        console.log("\nResult:\n", _inspect(result))
        // Results are strings from the parallel pipe operations
        const expected = Array.from({ length: 25 }, (_, i) => String(i))
        expect(result).toEqual(expected)
    })
})
