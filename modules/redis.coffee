redisClient = require('redis').createClient

exports.connect = (config) ->
    redis_client = redisClient(null, config.host)
    fns =
        redis: (inp, args, ctx, cb) ->
            redis_client[args[0]] args.slice(1)..., (err, ret) ->
                cb null, ret


