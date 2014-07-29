xml2js = require 'xml2js'

exports.xml2js = (inp, args, ctx, cb) ->
    parser = new xml2js.Parser()
    parser.parseString inp, cb

