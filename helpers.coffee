util = require 'util'

exports.stringify = (o) ->
    if typeof o == 'string'
        return o
    else if typeof o == 'object'
        return util.inspect o, depth: null
    else if !o?
        return '(empty message)'
    else
        return o

