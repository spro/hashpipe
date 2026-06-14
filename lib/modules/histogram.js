"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.histogram = void 0;
const helpers_1 = require("../helpers");
function padded(s, n = 40) {
    return make_padding(n - s.length) + s;
}
function make_padding(n) {
    return Array(n + 1)
        .fill(" ")
        .join("");
}
function make_histogram(l, x = "#") {
    const rows = [];
    for (let n of l) {
        let r = "";
        if (typeof n === "object") {
            r = padded(n.item + " ");
            n = n.count;
        }
        for (let i = 0; i < n; i++) {
            r += x;
        }
        rows.push(r);
    }
    return rows.join("\n");
}
exports.histogram = (0, helpers_1.command)((inp, args) => make_histogram(inp || args[0]));
//# sourceMappingURL=histogram.js.map