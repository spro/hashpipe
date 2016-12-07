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
exports.ls2 = (inp, args, ctx, cb) ->
    filename = resolvePath args[0] || '.'
    fs.readdir filename, (err, filenames) ->
        filenames = filenames.filter (f) -> f[0] != '.'
        files = filenames.filter (subfilename) ->
            fs.lstatSync(path.join filename, subfilename).isFile()
        dirs = filenames.filter (subfilename) ->
            fs.lstatSync(path.join filename, subfilename).isDirectory()
        cb null, {dirs, files}

# cd "dir" -> success
exports.cd = (inp, args, ctx, cb) ->
    dirname = resolvePath args[0] or process.env.HOME
    process.chdir dirname
    cb null
