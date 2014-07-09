util = require 'util'

exports.prettyPrint = (o) ->
    return util.inspect o, depth: null, colors: true

