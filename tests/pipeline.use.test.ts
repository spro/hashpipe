import { describe, expect, test } from "vitest"
import { Pipeline } from "../src/pipeline"

describe("Pipeline module loading", () => {
    test("registers module command at namespace root when names match", () => {
        const pipe = new Pipeline()
        pipe.use("keywords")

        const registered = pipe.getLastRegisteredFns()
        expect(registered).not.toContain("keywords.keywords")
        expect(registered).toContain("keywords")

        const namespaced = pipe.get("fns", "keywords.keywords")
        const alias = pipe.get("fns", "keywords")

        expect(typeof namespaced).toBe("function")
        expect(alias).toBe(namespaced)
    })
})
