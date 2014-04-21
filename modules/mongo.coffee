mongodb = require 'mongodb'
locals = {}

exports.connect = (config) ->

    locals.db = null
    _db = new mongodb.Db(
        config.db,
        mongodb.Server(config.host, 27017),
        safe: true
    )
    _db.open (err, db) -> locals.db = db

    fns =

        mongo: (inp, args, ctx, cb) ->
            collection = args[0]
            command = args[1]
            locals.db.collection(collection)[command](args[2] || {}).toArray cb

    return fns

exports.db = -> locals.db
