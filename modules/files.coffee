fs = require 'fs'
path = require 'path'

resolvePath = (string) ->
    if string.substr(0,1) == '~'
        string = process.env.HOME + string.substr(1)
    return path.resolve(string)

# cat "filename" -> "file"
exports.cat = (inp, args, ctx, cb) ->
    filename = resolvePath args[0]
    fs.readFile filename, (err, buffer) ->
        cb err, buffer.toString()

# cat-stream "filename" -> {file}
exports['cat-stream'] = (inp, args, ctx, cb) ->
    filename = resolvePath args[0]
    cb null, fs.createReadStream filename

# "file" -> write "filename" -> "file"
exports.write = (inp, args, ctx, cb) ->
    filename = resolvePath args[0]
    fs.writeFile filename, inp, (err) ->
        cb null, inp

# ls "dir?" -> ["filename"]
exports.ls = (inp, args, ctx, cb) ->
    filename = resolvePath args[0] || '.'
    fs.readdir filename, cb

# cd "dir" -> success
exports.cd = (inp, args, ctx, cb) ->
    dirname = resolvePath args[0]
    process.chdir dirname
    cb null, success: true, dir: process.cwd()

# mv "from" "to" -> success
exports.mv = (inp, args, ctx, cb) ->
    filename0 = resolvePath args[0]
    filename1 = resolvePath args[1]
    fs.rename filename0, filename1, (err) ->
        cb null, success: !err?
