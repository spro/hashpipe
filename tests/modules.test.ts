import { describe, test, expect, beforeAll, afterAll } from "vitest"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { Pipeline } from "../src/pipeline"
import { execPipeline } from "./helpers"

// ======================
// SETUP
// ======================

const execFresh = (
    cmd: string,
    setup?: (pipe: Pipeline) => void,
): Promise<any> => {
    const pipe = new Pipeline()
    if (setup) setup(pipe)
    return execPipeline(pipe, cmd, { ctx: pipe.subScope({ vars: {} }) })
}

// Fixture modules in a temp dir, plus a fake npm package in the
// project's node_modules
const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashpipe-mods-"))
const npmPkgDir = path.join(process.cwd(), "node_modules", "hashpipe-testmod")

beforeAll(() => {
    fs.writeFileSync(
        path.join(fixtureDir, "greeter.js"),
        `exports.hello = (inp, args, ctx, cb) => cb(null, "hello " + (args[0] || inp))\n`,
    )
    // Shadows the bundled http module when fixtureDir is on HASHPIPE_PATH
    fs.writeFileSync(
        path.join(fixtureDir, "http.js"),
        `exports.marker = (inp, args, ctx, cb) => cb(null, "from-hashpipe-path")\n`,
    )
    // Bare-name export shadowing a builtin
    fs.writeFileSync(
        path.join(fixtureDir, "upper.js"),
        `exports.upper = (inp, args, ctx, cb) => cb(null, "shadowed-by-module")\n`,
    )
    fs.mkdirSync(npmPkgDir, { recursive: true })
    fs.writeFileSync(
        path.join(npmPkgDir, "package.json"),
        JSON.stringify({ name: "hashpipe-testmod", main: "index.js" }),
    )
    fs.writeFileSync(
        path.join(npmPkgDir, "index.js"),
        `exports.ping = (inp, args, ctx, cb) => cb(null, "pong")\n`,
    )
})

afterAll(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true })
    fs.rmSync(npmPkgDir, { recursive: true, force: true })
    delete process.env.HASHPIPE_PATH
})

// ======================
// TESTS
// ======================

describe("module search path", () => {
    test("explicit absolute paths load from anywhere", async () => {
        const result = await execFresh(
            `use ${fixtureDir}/greeter.js ; greeter.hello world`,
        )
        expect(result).toEqual("hello world")
    })

    test("bare names resolve through HASHPIPE_PATH", async () => {
        process.env.HASHPIPE_PATH = fixtureDir
        try {
            const result = await execFresh(`use greeter ; greeter.hello there`)
            expect(result).toEqual("hello there")
        } finally {
            delete process.env.HASHPIPE_PATH
        }
    })

    test("HASHPIPE_PATH beats the bundled modules", async () => {
        process.env.HASHPIPE_PATH = fixtureDir
        try {
            const result = await execFresh(`use http ; http.marker`)
            expect(result).toEqual("from-hashpipe-path")
        } finally {
            delete process.env.HASHPIPE_PATH
        }
    })

    test("bundled modules still load by bare name", async () => {
        const result = await execFresh(
            `use replace ; echo hello world | replace world there`,
        )
        expect(result).toEqual("hello there")
    })

    test("npm packages load via the hashpipe- prefix", async () => {
        const result = await execFresh(`use testmod ; testmod.ping`)
        expect(result).toEqual("pong")
    })

    test("explicit paths to hashpipe-prefixed packages drop the prefix", async () => {
        const pkgDir = path.join(fixtureDir, "hashpipe-waver")
        fs.mkdirSync(pkgDir, { recursive: true })
        fs.writeFileSync(
            path.join(pkgDir, "index.js"),
            `exports.wave = (inp, args, ctx, cb) => cb(null, "wave!")\n`,
        )
        const result = await execFresh(`use ${pkgDir} ; waver.wave`)
        expect(result).toEqual("wave!")
    })

    test("generic npm package names are not tried", async () => {
        // `async` is a real dependency in node_modules; only
        // hashpipe-async may be attempted, so this must miss
        await expect(execFresh(`use async`)).rejects.toMatch(/not found/)
    })

    test("a total miss lists the attempted locations", async () => {
        await expect(execFresh(`use no-such-mod-xyz`)).rejects.toMatch(
            /Tried:.*hashpipe-no-such-mod-xyz/s,
        )
    })
})

describe("shadow reporting", () => {
    test("use reports when it shadows an existing command", async () => {
        process.env.HASHPIPE_PATH = fixtureDir
        try {
            const result = await execFresh(`use upper`)
            expect(result).toMatch(/shadowing: upper/)
        } finally {
            delete process.env.HASHPIPE_PATH
        }
    })

    test("the shadowing module wins; builtin still reachable", async () => {
        process.env.HASHPIPE_PATH = fixtureDir
        try {
            const result = await execFresh(
                `use upper ; echo hi | upper`,
            )
            expect(result).toEqual("shadowed-by-module")
            const original = await execFresh(
                `use upper ; echo hi | builtin upper`,
            )
            expect(original).toEqual("HI")
        } finally {
            delete process.env.HASHPIPE_PATH
        }
    })
})
