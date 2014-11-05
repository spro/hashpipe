padded = (s, n=40) ->
    make_padding(n - s.length) + s

make_padding = (n) ->
    (' ' for i in [0..n]).join('')

make_histogram = (l, x='#') ->
    rows = []
    for n in l
        if typeof n == 'object'
            r = padded n.item + ' '
            n = n.count
        else
            r = ''
        for i in [0..n-1]
            r += x
        rows.push r
    rows.join '\n'

exports.histogram = (inp, args, ctx, cb) ->
    cb null, make_histogram(inp || args[0])

