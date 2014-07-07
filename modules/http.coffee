# HTTP Requests

request = require('request').defaults({ encoding: null })

parseResponseData = (data) ->
    if data instanceof Buffer or typeof data == 'string'
        try
            data = JSON.parse data
        catch e
            if data instanceof Buffer
                data = data.toString()
    return data

# get "url" -> {data} / "html"
exports.get = (inp, args, ctx, cb) ->
    request_options =
        url: args[0]
        json: true
        headers:
            'user-agent': 'Qnectar Pipeline HTTP Module'
    request.get request_options, (err, res, data) ->
        cb null, parseResponseData data

# {data} -> post "url" -> {data} / "html"
exports.post = (inp, args, ctx, cb) ->
    request_options =
        url: args[0]
        method: 'POST'
        json: (typeof inp == 'object')
        body: inp
        headers:
            'user-agent': 'Qnectar Pipeline HTTP Module'
    req = request request_options, (err, res, data) ->
        cb null, parseResponseData data
    # The multipart way
    # req_data = req.form()
    # req_data.append k, v for k, v of inp
    if auth = args[1]
        req.auth auth.username, auth.password

# {data} -> post "url" -> {data} / "html"
exports.put = (inp, args, ctx, cb) ->
    request_options =
        url: args[0]
        method: 'PUT'
        json: true
        body: inp
        headers:
            'user-agent': 'Qnectar Pipeline HTTP Module'
    req = request request_options, (err, res, data) ->
        cb null, parseResponseData data
    # The multipart way
    # req_data = req.form()
    # req_data.append k, v for k, v of inp
    if auth = args[1]
        req.auth auth.username, auth.password

# delete "url" -> ok
exports.delete = (inp, args, ctx, cb) ->
    request_options =
        url: args[0]
        method: 'DELETE'
        headers:
            'user-agent': 'Qnectar Pipeline HTTP Module'
    request request_options, (err, res, data) ->
        cb null, data


exports.tostring = (inp, args, ctx, cb) -> cb null, inp.toString()
