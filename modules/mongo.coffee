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
    new mongodb.Db(
        config?.db || 'qnectar',
        mongodb.Server(config?.host || 'localhost', 27017),
        safe: true
    ).open (err, db) -> locals.db = db

    fns =

        mongo: (inp, args, ctx, cb) ->
            command = args[0]
            collection = args[1]
            query = args[2] || {}
            options = args[3] || {}

            query = fixQueryIds query

            if command == 'use'
                new mongodb.Db(
                    args[1],
                    mongodb.Server(config?.host || 'localhost', 27017),
                    safe: true
                ).open (err, db) ->
                    locals.db = db
                    cb null, success: true

            else if command in ['eval']
                locals.db[command](args.slice(1)..., cb)

            else if command == 'collections'
                locals.db.collectionNames(cb)

            else if command == 'dbs'
                locals.db.eval("db.getMongo().getDBNames()", cb)

            else if command == 'find'
                locals.db.collection(collection)[command](query, options).toArray cb

            else
                locals.db.collection(collection)[command](query, options, cb)

    return fns

exports.db = -> locals.db
