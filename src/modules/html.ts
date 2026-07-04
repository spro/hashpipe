import { JSDOM } from "jsdom"
import jquery from "jquery"
import { HashpipeFunction, command } from "../helpers"

// "html" -> html2text -> "text"
export const html2text: HashpipeFunction = command((inp) => {
    const dom = new JSDOM(inp)
    const $ = jquery(dom.window as any) as any
    const win = dom.window as any
    const blocks = new Set(["h1", "h2", "h3", "p"])
    const parts: string[] = []
    // Collect headings/paragraphs anywhere, plus loose text at the top level
    // (HN comments lead with a bare text node and aren't all wrapped in <p>).
    const walk = (node: any, topLevel: boolean) => {
        for (const child of Array.from(node.childNodes) as any[]) {
            if (child.nodeType === win.Node.TEXT_NODE) {
                if (!topLevel) continue
                const text = (child.textContent || "").trim()
                if (text) parts.push(text)
            } else if (child.nodeType === win.Node.ELEMENT_NODE) {
                const tag = child.tagName.toLowerCase()
                if (blocks.has(tag)) {
                    const text = $(child).text().trim()
                    if (text) parts.push(text)
                } else if (tag !== "script" && tag !== "style") {
                    walk(child, false)
                }
            }
        }
    }
    walk(win.document.body, true)
    return parts.join(" ... ")
})

// "html" -> jq "selectors" -> [json elements]
export const jq: HashpipeFunction = command((inp, args) => {
    const dom = new JSDOM(inp)
    const $ = jquery(dom.window as any) as any
    const els: any[] = []

    $(args.join(" ")).each(function (this: any) {
        const $el = $(this)
        const el_json: any = {
            text: $el.text(),
        }
        const element = this as any
        if (element.attributes) {
            for (const attr of Array.from(element.attributes) as any[]) {
                el_json[attr.name] = attr.value
            }
        }
        els.push(el_json)
    })

    return els
})
