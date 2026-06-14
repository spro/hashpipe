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
    return $("h1, h2, h3, p")
        .map(function () {
        return $(this).text();
    })
        .get()
        .join(" ... ");
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