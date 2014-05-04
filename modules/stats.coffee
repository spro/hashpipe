statistics = require 'simple-statistics'

exports.linreg = (inp, args, ctx, cb) ->
    cb null, statistics.linear_regression().data(inp).mb()

