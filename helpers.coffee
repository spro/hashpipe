util = require 'util'

exports.prettyPrint = (o) ->
    return util.inspect o, depth: null, colors: true

exports.wrapone = wrapone = (f) ->
    (inp, args, ctx, cb) ->
        console.log 'running ' + f
        f args..., cb

exports.wrapall = (o, pre='') ->
    wo = {}
    for k, f of o
        if typeof f == 'function'
            wo[pre+k] = wrapone f
    wo

