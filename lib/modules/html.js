"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jq = exports.html2text = void 0;
const jsdom_1 = require("jsdom");
const jquery_1 = __importDefault(require("jquery"));
const helpers_1 = require("../helpers");
// "html" -> html2text -> "text"
exports.html2text = (0, helpers_1.command)((inp) => {
    const dom = new jsdom_1.JSDOM(inp);
    const $ = (0, jquery_1.default)(dom.window);
    const win = dom.window;
    const blocks = new Set(["h1", "h2", "h3", "p"]);
    const parts = [];
    // Collect headings/paragraphs anywhere, plus loose text at the top level
    // (HN comments lead with a bare text node and aren't all wrapped in <p>).
    const walk = (node, topLevel) => {
        for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === win.Node.TEXT_NODE) {
                if (!topLevel)
                    continue;
                const text = (child.textContent || "").trim();
                if (text)
                    parts.push(text);
            }
            else if (child.nodeType === win.Node.ELEMENT_NODE) {
                const tag = child.tagName.toLowerCase();
                if (blocks.has(tag)) {
                    const text = $(child).text().trim();
                    if (text)
                        parts.push(text);
                }
                else if (tag !== "script" && tag !== "style") {
                    walk(child, false);
                }
            }
        }
    };
    walk(win.document.body, true);
    return parts.join(" ... ");
});
// "html" -> jq "selectors" -> [json elements]
exports.jq = (0, helpers_1.command)((inp, args) => {
    const dom = new jsdom_1.JSDOM(inp);
    const $ = (0, jquery_1.default)(dom.window);
    const els = [];
    $(args.join(" ")).each(function () {
        const $el = $(this);
        const el_json = {
            text: $el.text(),
        };
        const element = this;
        if (element.attributes) {
            for (const attr of Array.from(element.attributes)) {
                el_json[attr.name] = attr.value;
            }
        }
        els.push(el_json);
    });
    return els;
});
//# sourceMappingURL=html.js.map