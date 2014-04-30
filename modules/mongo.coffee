mongodb = require 'mongodb'
locals = {}

fixQueryIds = (query) ->
    fixed_query = {}
    for k, v of query
        if k == '_id'
            v = mongodb.ObjectID v
        fixed_query[k] = v
    fixed_query

exports.connect = (config) ->

    locals.db = null
    _db = new mongodb.Db(
        config?.db || 'qnectar',
        mongodb.Server(config?.host || 'localhost', 27017),
        safe: true
    )
    _db.open (err, db) -> locals.db = db

    fns =

        mongo: (inp, args, ctx, cb) ->
            collection = args[0]
            command = args[1] || 'count'
            query = args[2] || {}
            query = fixQueryIds query
            options = args[3] || {}
            if command == 'find'
                locals.db.collection(collection)[command](query, options).toArray cb
            else
                locals.db.collection(collection)[command](query, options, cb)

    return fns

exports.db = -> locals.db
