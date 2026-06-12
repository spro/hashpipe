import { describe, test, expect } from "vitest"
import { Pipeline } from "../src/pipeline"
import { Lambda } from "../src/helpers"
import { _inspect, execPipeline, showParsed } from "./helpers"

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

describe("Lambda literals", () => {
    test("lambda literal evaluates to a function value", async () => {
        const cmd = `{| * 2 }`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toBeInstanceOf(Lambda)
        expect(String(result)).toEqual("{| * 2 }")
    })

    test("lambda piped into directly is invoked", async () => {
        const cmd = `5 | {| * 2 }`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual(10)
    })

    test("lambda stored in a variable and invoked by pipe", async () => {
        const cmd = `$double = {| * 2 } ; 5 | $double`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual(10)
    })

    test("lambda serializes to its source", async () => {
        const cmd = `$f = {| * 2 } ; $f | stringify`
        const result = await execScript(cmd)
        expect(result).toEqual('"{| * 2 }"')
    })
})

describe("map / each / reduce", () => {
    test("map with an inline lambda", async () => {
        const cmd = `[1, 2, 3] | map {| * 2 }`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual([2, 4, 6])
    })

    test("map with a lambda from a variable", async () => {
        const cmd = `$triple = {| * 3 } ; [1, 2, 3] | map $triple`
        const result = await execScript(cmd)
        expect(result).toEqual([3, 6, 9])
    })

    test("each runs the lambda but returns the input", async () => {
        const cmd = `[1, 2, 3] | each {| * 100 }`
        const result = await execScript(cmd)
        expect(result).toEqual([1, 2, 3])
    })

    test("reduce with an initial value", async () => {
        const cmd = `[1, 2, 3, 4] | reduce { $x | + $x } 0`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual(10)
    })

    test("reduce without an initial value uses the first item", async () => {
        const cmd = `[1, 2, 3, 4] | reduce { $x | + $x }`
        const result = await execScript(cmd)
        expect(result).toEqual(10)
    })
})

describe("filter", () => {
    test("filter with a lambda predicate", async () => {
        const cmd = `[{name: 'huey', ok: true}, {name: 'dewey', ok: false}, {name: 'louie', ok: true}] | filter {| @ ok } @ :name`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual(["huey", "louie"])
    })

    test("filter with no arguments keeps truthy items (back-compat)", async () => {
        const cmd = `[0, 1, 2] | filter`
        const result = await execScript(cmd)
        expect(result).toEqual([1, 2])
    })

    test("filter with a JS expression string still works (legacy)", async () => {
        const cmd = `[1, 2, 3, 4] | filter 'i > 2'`
        const result = await execScript(cmd)
        expect(result).toEqual([3, 4])
    })
})

describe("def", () => {
    test("def with a named input", async () => {
        const cmd = `def human-years { $n | $n | * 7 } ; human-years 6`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual(42)
    })

    test("def with a hugging named input", async () => {
        const cmd = `def human-years {$n| $n | * 7 } ; human-years 4`
        const result = await execScript(cmd)
        expect(result).toEqual(28)
    })

    test("defined command receives piped input", async () => {
        const cmd = `def shout {| upper } ; echo hello | shout`
        const result = await execScript(cmd)
        expect(result).toEqual("HELLO")
    })

    test("defined command works as a bare-name reference", async () => {
        const cmd = `def shout2 {| upper } ; list a b | map shout2`
        const result = await execScript(cmd)
        expect(result).toEqual(["A", "B"])
    })

    test("def with a multi-pipeline body", async () => {
        const cmd = `def both {| echo first ; echo second } ; both`
        const result = await execScript(cmd)
        expect(result).toEqual("second")
    })

    test("def rejects a non-lambda body", async () => {
        const cmd = `def broken oops`
        await expect(execScript(cmd)).rejects.toBeTruthy()
    })
})

describe("call and closures", () => {
    test("call invokes a lambda from a variable with arguments", async () => {
        const cmd = `set greet { $name | echo Hello $name } ; call $greet World`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual("Hello World")
    })

    test("lambdas capture their defining scope (closures)", async () => {
        const cmd = `def adder { $n | {| + $n } } ; 3 | call $(adder 5)`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual(8)
    })
})

describe("if laziness", () => {
    test("untaken else branch never runs", async () => {
        const cmd = `if true {| echo yes } {| this-command-does-not-exist }`
        const result = await execScript(cmd)
        expect(result).toEqual("yes")
    })

    test("untaken then branch never runs", async () => {
        const cmd = `if false {| this-command-does-not-exist } {| echo no }`
        const result = await execScript(cmd)
        expect(result).toEqual("no")
    })

    test("plain value branches still work (back-compat)", async () => {
        const cmd = `if true yes`
        const result = await execScript(cmd)
        expect(result).toEqual("yes")
    })
})

describe("sortBy / groupBy with lambdas", () => {
    test("sortBy with a lambda key extractor", async () => {
        const cmd = `[{n: 3}, {n: 1}, {n: 2}] | sortBy {| @ n } @ :n`
        const result = await execScript(cmd)
        expect(result).toEqual([1, 2, 3])
    })

    test("sortBy with a string key still works (back-compat)", async () => {
        const cmd = `[{n: 3}, {n: 1}, {n: 2}] | sortBy n @ :n`
        const result = await execScript(cmd)
        expect(result).toEqual([1, 2, 3])
    })

    test("groupBy with a lambda key extractor", async () => {
        const cmd = `[{kind: 'a', v: 1}, {kind: 'b', v: 2}, {kind: 'a', v: 3}] | groupBy {| @ kind }`
        const result = await execScript(cmd)
        expect(result).toEqual({
            a: [
                { kind: "a", v: 1 },
                { kind: "a", v: 3 },
            ],
            b: [{ kind: "b", v: 2 }],
        })
    })
})

describe("alias rework", () => {
    test("alias still reports its script source", async () => {
        const cmd = `alias sayhowdy = echo "howdy there"`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual({
            success: true,
            alias: "sayhowdy",
            script: 'echo "howdy there"',
        })
    })

    test("alias body stops at semicolon, then runs", async () => {
        const cmd = `alias sevens = * 7 ; 6 | sevens`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual(42)
    })

    test("alias appends call-site args to its first command", async () => {
        const cmd = `alias greet2 = echo hello ; greet2 world`
        const result = await execScript(cmd)
        expect(result).toEqual("hello world")
    })

    test("alias bodies are not substituted at definition time", async () => {
        const cmd = `$who = 'nobody' ; alias greethi = echo hi $who ; $who = 'world' ; greethi`
        const result = await execScript(cmd)
        expect(result).toEqual("hi world")
    })
})

describe("named input binding", () => {
    test("name binds the argument when given", async () => {
        const cmd = `def human-years { $n | $n * 7 } ; human-years 6`
        const result = await execScript(cmd)
        expect(result).toEqual(42)
    })

    test("name binds the piped input when no argument is given", async () => {
        const cmd = `def human-years { $n | $n * 7 } ; 6 | human-years`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual(42)
    })

    test("multiple names bind arguments in order", async () => {
        const cmd = `def pair { $a $b | [$a, $b] } ; pair 1 2`
        const result = await execScript(cmd)
        expect(result).toEqual([1, 2])
    })

    test("a name without a matching argument receives the input", async () => {
        const cmd = `def pair { $a $b | [$a, $b] } ; 5 | pair 3`
        const result = await execScript(cmd)
        expect(result).toEqual([3, 5])
    })

    test("arguments beyond the named ones land in $args", async () => {
        const cmd = `def f { $a | [$a, $args] } ; f 1 2 3`
        const result = await execScript(cmd)
        expect(result).toEqual([1, [2, 3]])
    })

    test("bare words before a pipe are never input names", async () => {
        const cmd = `def cleanup {| trim | upper } ; "  hi  " | cleanup`
        const result = await execScript(cmd)
        expect(result).toEqual("HI")
    })
})

describe("infix expressions", () => {
    test("def with an infix body", async () => {
        const cmd = `def dog-years { $n | $n * 7 } ; dog-years 6`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual(42)
    })

    test("arithmetic with precedence", async () => {
        const cmd = `2 + 3 * 4`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual(14)
    })

    test("arithmetic does not require spaces around operators", async () => {
        expect(await execScript(`12+1`)).toEqual(13)
        expect(await execScript(`2+3*4`)).toEqual(14)
        expect(await execScript(`10|$!-4`)).toEqual(6)
    })

    test("parentheses override precedence", async () => {
        const cmd = `(2 + 3) * 4`
        const result = await execScript(cmd)
        expect(result).toEqual(20)
    })

    test("variables as operands", async () => {
        const cmd = `$n = 6 ; $n * 7`
        const result = await execScript(cmd)
        expect(result).toEqual(42)
    })

    test("piped input via $!", async () => {
        const cmd = `10 | $! - 4`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual(6)
    })

    test("infix inside a map lambda", async () => {
        const cmd = `[1, 2, 3] | map {| $! * 10 }`
        const result = await execScript(cmd)
        expect(result).toEqual([10, 20, 30])
    })

    test("modulo", async () => {
        const cmd = `7 % 2`
        const result = await execScript(cmd)
        expect(result).toEqual(1)
    })

    test("sub-commands as operands", async () => {
        const cmd = `$(list 1 2 3 | length) * 2`
        const result = await execScript(cmd)
        expect(result).toEqual(6)
    })

    test("comparisons", async () => {
        expect(await execScript(`5 > 3`)).toEqual(true)
        expect(await execScript(`2 >= 3`)).toEqual(false)
        expect(await execScript(`2 <= 2`)).toEqual(true)
    })

    test("equality with strings", async () => {
        const cmd = `echo fred | $! == 'fred'`
        const result = await execScript(cmd)
        expect(result).toEqual(true)
    })

    test("inequality", async () => {
        const cmd = `$x = 5 ; $x != 6`
        const result = await execScript(cmd)
        expect(result).toEqual(true)
    })

    test("filter with a comparison predicate", async () => {
        const cmd = `[{name: 'sparky', age: 58}, {name: 'woofer', age: 6}] | filter {| $(@ age) > 30 } @ :name`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual(["sparky"])
    })

    test("infix over a parallel pipe", async () => {
        const cmd = `[1, 2, 3] || $! * 2`
        const result = await execScript(cmd)
        expect(result).toEqual([2, 4, 6])
    })
})
