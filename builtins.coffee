_ = require 'underscore'

# Command helpers
combine = (inp, args) -> _.flatten([inp].concat(args)).filter (i) -> i
nums = (l) -> l.map (n) -> Number(n) || 0
calc = (f) ->
    (inp, args, ctx, cb) ->
        cb null, nums(combine(inp, args)).reduce(f)

# Test data
dog_people = [
    name:'bill',
    dogs: [
        name: 'sparky'
        age: 58
    ,
        name: 'woofer'
        age: 6
    ],
,
    name:'fred',
    dogs: []
]

module.exports = builtins =
    id: (inp, args, ctx, cb) -> cb null, inp
    echo: (inp, args, ctx, cb) -> cb null, args.join(' ')
    list: (inp, args, ctx, cb) -> cb null, args
    dog_people: (inp, args, ctx, cb) -> cb null, dog_people
    '+': calc (a, b) -> a + b
    '*': calc (a, b) -> a * b
    '-': calc (a, b) -> a - b
    '/': calc (a, b) -> a / b

