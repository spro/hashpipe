{exec} = require 'child_process'

exports.exec = (inp, args, ctx, cb) ->
    exec args[0], (err, stdout, stderr) ->
        cb null, stdout
