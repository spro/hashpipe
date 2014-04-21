# HTTP Requests

request = require 'request'

# get "url" -> {data} / "html"
exports.get = (inp, args, ctx, cb) ->
    request.get {url: args[0], json: true}, (err, res, data) ->
        cb null, data

