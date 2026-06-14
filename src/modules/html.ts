import { JSDOM } from "jsdom"
import jquery from "jquery"
import { HashpipeFunction, command } from "../helpers"

// "html" -> html2text -> "text"
export const html2text: HashpipeFunction = command((inp) => {
    const dom = new JSDOM(inp)
    const $ = jquery(dom.window as any) as any
    return $("h1, h2, h3, p")
        .map(function (this: any) {
            return $(this).text()
        })
        .get()
        .join(" ... ")
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
