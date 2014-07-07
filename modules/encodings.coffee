# Encodings and decodings
#

exports.atob = (inp, args, ctx, cb) ->
    tob = new Buffer(inp, 'base64').toString('binary')
    cb null, tob

exports.btoa = (inp, args, ctx, cb) ->
    buffer = null

    if inp instanceof Buffer
        buffer = inp
    else
        buffer = new Buffer(inp.toString(), 'binary')

    toa = buffer.toString 'base64'
    cb null, toa
