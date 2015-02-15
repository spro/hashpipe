# HTTP Requests

request = require('request').defaults({ encoding: null })
_ = require 'underscore'

# Response parsers

_parseResponseData = (res, data) ->
    if data instanceof Buffer or typeof data == 'string'
        try
            data = JSON.parse data
        catch e
            if data instanceof Buffer
                data = data.toString()
    return data

parseResponseData = (cb) ->
    (err, res, data) ->
        cb err, _parseResponseData res, data

_parseResponseHeaders = (res, data) ->
    return res.headers

parseResponseHeaders = (cb) ->
    (err, res, data) ->
        cb err, _parseResponseHeaders res, data

parseResponseAll = (cb) ->
    (err, res, data) ->
        cb err,
            data: _parseResponseData res, data
            headers: _parseResponseHeaders res, data

# Abstract http method using given response parser

# METHOD url {query} {auth, headers}

httpMethod = (method, responseParser=parseResponseData) ->
    (inp, args, ctx, cb) ->
        {headers, auth} = args[2] || {}
        request_options =
            url: args[0]
            method: method
            json: !inp? || (typeof inp == 'object')
            body: inp if method != 'GET'
            qs: args[1] if method == 'GET'
            headers: _.extend
                'user-agent': 'Hashpipe HTTP Module'
            , headers
        req = request request_options, responseParser cb
        # The multipart way
        # req_data = req.form()
        # req_data.append k, v for k, v of inp
        if auth
            req.auth auth.username, auth.password

# get "url" -> {data} / "html"
exports.get = httpMethod 'GET'
exports['get-headers'] = httpMethod 'GET', parseResponseHeaders
exports['get-all'] = httpMethod 'GET', parseResponseAll

# {data} -> post "url" -> {data} / "html"
exports.post = httpMethod 'POST'

# {data} -> post "url" -> {data} / "html"
exports.put = httpMethod 'PUT'

# delete "url" -> ok
exports.delete = httpMethod 'DELETE'

exports.tostring = (inp, args, ctx, cb) -> cb null, inp.toString()

