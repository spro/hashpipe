"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.json2csv = void 0;
const helpers_1 = require("../helpers");
exports.json2csv = (0, helpers_1.command)((inp) => {
    const fields = [];
    // First pass to get fields
    for (const i of inp) {
        for (const k of Object.keys(i)) {
            if (!fields.includes(k)) {
                fields.push(k);
            }
        }
    }
    // Second pass to make rows
    const rows = [];
    for (const i of inp) {
        const row = [];
        for (const f of fields) {
            row.push(JSON.stringify(i[f]));
        }
        rows.push(row.join(","));
    }
    // Add fields header and join them together
    rows.unshift(fields.join(","));
    return rows.join("\n");
});
//# sourceMappingURL=csv.js.map