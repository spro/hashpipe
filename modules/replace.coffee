exports.replace = (inp, args, ctx, cb) ->
    cb null, inp.replace args[0], args[1]
