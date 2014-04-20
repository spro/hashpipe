module.exports = (config) ->
    redis = require('redis').createClient(null, config.redis.host)
    fns =

        redis: (inp, args, ctx, cb) ->
            redis[args[0]] args.slice(1)..., (err, ret) ->
                cb null, ret

    return fns

