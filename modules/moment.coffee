moment = require 'moment'

exports['format-date'] = (inp, args, ctx, cb) ->
    cb null, moment(inp).format(args[0])
