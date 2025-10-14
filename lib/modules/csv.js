"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.json2csv = void 0;
const json2csv = (inp, args, ctx, cb) => {
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
    cb(null, rows.join("\n"));
};
exports.json2csv = json2csv;
//# sourceMappingURL=csv.js.map