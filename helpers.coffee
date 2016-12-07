util = require 'util'

exports.prettyPrint = (o) ->
    if typeof o == 'object'
        return util.inspect o, depth: null, colors: true
    else
        "#{o}"

exports.wrapone = wrapone = (f, with_inp=false) ->
    (inp, args, ctx, cb) ->
        args.unshift(inp) if with_inp
        f args..., cb

exports.wraponeSync = wraponeSync = (f, with_inp=false) ->
    (inp, args, ctx, cb) ->
        args.unshift(inp) if with_inp
        cb null, f args...

exports.wrapall = (o, pre='', with_inp=false, sync=false) ->
    wo = {}
    for k, f of o
        if typeof f == 'function'
            wrapf = if sync then wraponeSync else wrapone
            wo[pre+k] = wrapf f, with_inp
    wo

