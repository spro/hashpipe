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

describe("comments", () => {
    test("a full-line comment is ignored", async () => {
        const result = await execScript("# just a note\necho hi")
        expect(result).toEqual("hi")
    })

    test("comments work between ; statements", async () => {
        const result = await execScript("echo a ; # note ; echo b")
        expect(result).toEqual("b")
    })

    test("# mid-word stays literal", async () => {
        const result = await execScript("echo page#section")
        expect(result).toEqual("page#section")
    })

    test("comment-only input passes the input through", async () => {
        const result = await execScript("# nothing here", "passthru")
        expect(result).toEqual("passthru")
    })
})

describe("newlines as statement separators", () => {
    test("newline separates statements", async () => {
        const cmd = "$x = 2\n$y = 3\n$x * $y"
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual(6)
    })

    test("last statement's result is returned", async () => {
        const result = await execScript("echo a\necho b")
        expect(result).toEqual("b")
    })

    test("trailing-pipe continuation spans lines", async () => {
        const result = await execScript("echo hi |\nupper")
        expect(result).toEqual("HI")
    })

    test("leading-pipe continuation spans lines", async () => {
        const result = await execScript("echo hi\n| upper")
        expect(result).toEqual("HI")
    })

    test("blank lines and trailing newlines are fine", async () => {
        const result = await execScript("\necho a\n\n\necho b\n")
        expect(result).toEqual("b")
    })

    test("a quoted value still ends at the newline", async () => {
        const result = await execScript("$q = 'quoted'\necho hi | upper")
        expect(result).toEqual("HI")
    })

    test("an at-expression still ends at the newline", async () => {
        const result = await execScript("{a: 1} @ a\necho next")
        expect(result).toEqual("next")
    })
})

describe("generic escapes", () => {
    test("escaped pipe", async () => {
        expect(await execScript("echo a \\| b")).toEqual("a | b")
    })

    test("escaped percent and hash", async () => {
        expect(await execScript("echo 100\\% \\#1")).toEqual("100% #1")
    })

    test("escaped dollar is not a variable", async () => {
        expect(await execScript("echo \\$tomorrow")).toEqual("$tomorrow")
    })

    test("escaped semicolon", async () => {
        expect(await execScript("echo a\\;b")).toEqual("a;b")
    })

    test("escaped backslash", async () => {
        expect(await execScript("echo back\\\\slash")).toEqual("back\\slash")
    })

    test("escaped space binds words into one argument", async () => {
        expect(await execScript("list a\\ b")).toEqual(["a b"])
    })

    test("escapes work in quoted strings", async () => {
        expect(await execScript("echo '\\$x'")).toEqual("$x")
        expect(await execScript('echo "a\\|b"')).toEqual("a|b")
    })

    test("mid-word @ still parses as a word", async () => {
        expect(await execScript("echo user@host")).toEqual("user@host")
    })
})

describe("quoted keys and wildcards in at-expressions", () => {
    test("quoted key reaches keys with spaces", async () => {
        const cmd = `{"content type": "json"} @ "content type"`
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual("json")
    })

    test("quoted key reaches keys with dots", async () => {
        const result = await execScript(`{"v1.2": "ok"} @ "v1.2"`)
        expect(result).toEqual("ok")
    })

    test("wildcard takes all values of an object", async () => {
        const result = await execScript(`{a: 1, b: 2} @ *`)
        expect(result).toEqual([1, 2])
    })

    test("wildcard chains with map accessors", async () => {
        const result = await execScript(`{a: {n: 1}, b: {n: 2}} @ *:n`)
        expect(result).toEqual([1, 2])
    })
})

describe("${var} and typed substitution", () => {
    test("braced form splices without eating the suffix", async () => {
        const cmd = "$file = 'data.json' ; echo ${file}_v2"
        showParsed(cmd)
        const result = await execScript(cmd)
        expect(result).toEqual("data.json_v2")
    })

    test("a lone $var argument keeps its type (object)", async () => {
        const result = await execScript(`$u = {name: 'Al'} ; list $u`)
        expect(result).toEqual([{ name: "Al" }])
    })

    test("a lone ${var} argument keeps its type", async () => {
        const result = await execScript("$u2 = {name: 'Al'} ; list ${u2}")
        expect(result).toEqual([{ name: "Al" }])
    })

    test("a lone $var argument keeps its type (number)", async () => {
        const result = await execScript(`$n = 5 ; list $n`)
        expect(result).toEqual([5])
    })

    test("values containing replacement patterns are inserted verbatim", async () => {
        const result = await execScript(`$v = 'a$&b' ; echo x$v`)
        expect(result).toEqual("xa$&b")
    })
})

describe("null literal", () => {
    test("null evaluates to null", async () => {
        const result = await execScript(`null`)
        expect(result).toBeNull()
    })

    test("null works in list literals", async () => {
        const result = await execScript(`[null, 1]`)
        expect(result).toEqual([null, 1])
    })
})
