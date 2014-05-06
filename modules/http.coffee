# HTTP Requests

request = require('request').defaults({ encoding: null })

# get "url" -> {data} / "html"
exports.get = (inp, args, ctx, cb) ->
    request.get {url: args[0]}, (err, res, data) ->
        cb null, data

# {data} -> post "url" -> {data} / "html"
exports.post = (inp, args, ctx, cb) ->
    r = request.post {url: args[0]}, (err, res, data) ->
        console.log "Got data of type #{ typeof data }"
        cb null, data
    f = r.form()
    for k, v of inp
        console.log k
        console.log v
        f.append k, v
    if auth = args[1]
        r.auth auth.username, auth.password
    console.log 'hopefully made a request'

exports.tostring = (inp, args, ctx, cb) -> cb null, inp.toString()
