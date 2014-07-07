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

httpMethod = (method) ->
    (inp, args, ctx, cb) ->
        request_options =
            url: args[0]
            method: method
            json: !inp? || (typeof inp == 'object')
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

# get "url" -> {data} / "html"
exports.get = httpMethod 'GET'

# {data} -> post "url" -> {data} / "html"
exports.post = httpMethod 'POST'

# {data} -> post "url" -> {data} / "html"
exports.put = httpMethod 'PUT'

# delete "url" -> ok
exports.delete = httpMethod 'DELETE'

exports.tostring = (inp, args, ctx, cb) -> cb null, inp.toString()

