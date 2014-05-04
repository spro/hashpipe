fs = require 'fs'

# cat "filename" -> "file"
exports.cat = (inp, args, ctx, cb) ->
    fs.readFile args[0], (err, buffer) ->
        cb err, buffer.toString()

# "file" -> write "filename" -> "file"
exports.write = (inp, args, ctx, cb) ->
    fs.writeFile args[0], inp, (err) ->
        cb null, inp

# ls "dir?" -> ["filename"]
exports.ls = (inp, args, ctx, cb) ->
    fs.readdir args[0] || '.', cb

# mv "from" "to" -> success
exports.mv = (inp, args, ctx, cb) ->
    fs.rename args[0], args[1], (err) ->
        cb null, success: !err?
