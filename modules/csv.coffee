exports.json2csv = (inp, args, ctx, cb) ->
    fields = []

    # First pass to get fields
    for i in inp
        for k, v of i
            if k not in fields
                fields.push k

    # Second pass to make rows
    rows = []
    for i in inp
        row = []
        for f in fields
            row.push JSON.stringify i[f]
        rows.push row.join(',')

    # Add fields header and join them together
    rows.unshift fields
    cb null, rows.join('\n')

