import { describe, expect, test } from "vitest"
import { Pipeline } from "../src/pipeline"
import { execPipeline } from "./helpers"

const sampleHtml = `
<!doctype html>
<html>
    <body>
        <h1 id="header">Welcome</h1>
        <p data-id="intro">First paragraph</p>
        <p class="note" data-id="outro">Second paragraph</p>
        <div><span>Skipped content</span></div>
    </body>
</html>
`

describe("html module", () => {
    const pipe = new Pipeline().use("html")

    const execHtml = (script: string) =>
        execPipeline(pipe, script, { input: sampleHtml })

    test("html.html2text extracts headings and paragraphs", async () => {
        const result = await execHtml("html.html2text")
        expect(result).toBe("Welcome ... First paragraph ... Second paragraph")
    })

    test("html.html2text keeps leading text and unwrapped comments", async () => {
        // HN comments lead with a bare text node and aren't all wrapped in <p>
        const comment = "First paragraph.<p>Second paragraph."
        const result = await execPipeline(pipe, "html.html2text", {
            input: comment,
        })
        expect(result).toBe("First paragraph. ... Second paragraph.")

        const plain = await execPipeline(pipe, "html.html2text", {
            input: "Just a plain comment.",
        })
        expect(plain).toBe("Just a plain comment.")
    })

    test("html.jq returns text and attributes for matching elements", async () => {
        const result = await execHtml('html.jq "p"')
        expect(result).toEqual([
            { text: "First paragraph", "data-id": "intro" },
            {
                text: "Second paragraph",
                class: "note",
                "data-id": "outro",
            },
        ])
    })
})
