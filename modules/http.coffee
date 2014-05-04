# HTTP Requests

request = require 'request'

# get "url" -> {data} / "html"
exports.get = (inp, args, ctx, cb) ->
    request_options =
        url: args[0]
        json: true
        headers:
            'user-agent': 'Qnectar Pipeline HTTP Module'
    request.get request_options, (err, res, data) ->
        cb null, data

