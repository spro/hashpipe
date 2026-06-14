import { HashpipeFunction, command } from "../helpers"

export const json2csv: HashpipeFunction = command((inp) => {
    const fields: string[] = []

    // First pass to get fields
    for (const i of inp) {
        for (const k of Object.keys(i)) {
            if (!fields.includes(k)) {
                fields.push(k)
            }
        }
    }

    // Second pass to make rows
    const rows: string[] = []
    for (const i of inp) {
        const row: string[] = []
        for (const f of fields) {
            row.push(JSON.stringify(i[f]))
        }
        rows.push(row.join(","))
    }

    // Add fields header and join them together
    rows.unshift(fields.join(","))
    return rows.join("\n")
})
