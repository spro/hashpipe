fs = require 'fs'
_ = require 'underscore'
util = require 'util'
_inspect = (o) -> util.inspect o, depth: null

module.exports = builtins = {}

# Command helpers
valid = (i) ->
    if _.isArray i
        return (i.length > 0)
    if _.isObject i
        return (_.keys(i).length > 0)
    if _.isString i
        return (i.length > 0)
    return i?
combine = (inp, args) -> _.flatten([inp].concat(args)).filter valid

# Arithmetic

num = (n) -> Number(n) || 0

bool = (v) ->
    if _.isString v
        return false if v == 'false'
        return true if v == 'true'
    else if v
        return true
    else
        return false

reducer = (f) ->
    (inp, args, ctx, cb) ->
        cb null, combine(inp, args).reduce(f)

builtins['+'] = reducer (a, b) -> num(a) + num(b)
builtins['*'] = reducer (a, b) -> num(a) * num(b)
builtins['-'] = reducer (a, b) -> num(a) - num(b)
builtins['/'] = reducer (a, b) -> num(a) / num(b)
builtins['.'] = reducer (a, b) -> a + b

# Basics

# `id` returns its input
# val -> id -> val
builtins.id = (inp, args, ctx, cb) -> cb null, inp

# `val` returns its first argument as is
# echo val -> "val"
builtins.val = (inp, args, ctx, cb) -> cb null, args[0]

# `echo` returns its arguments joined as a string
# echo val -> "val"
builtins.echo = (inp, args, ctx, cb) -> cb null, args.join(' ')

# `key` is `echo` without spaces, useful for building keys
# key "a" ":b:" "c" -> "a:b:c"
builtins.key = (inp, args, ctx, cb) -> cb null, args.join('')

# `num` coerces input into a number
# val -> num -> #val
builtins.num = (inp, args, ctx, cb) -> cb null, num inp

# `bool` coerces input into a boolean
# val -> bool -> val?
builtins.bool = (inp, args, ctx, cb) -> cb null, bool inp

# Building objects and arrays

# list val val val -> [val, val, val]
builtins.list = (inp, args, ctx, cb) -> cb null, args

# obj "key" val "key" val -> {key: val, key: val}
builtins.obj = (inp, args, ctx, cb) ->
    abj = {}
    if args.length
        i = 0
        while i < args.length
            abj[args[i]] = args[i+1]
            i+=2
    cb null, abj

builtins.extend = (inp, args, ctx, cb) ->
    cb null, _.extend inp, args[0]

# range #start? #stop -> [#i]
builtins.range = (inp, args, ctx, cb) ->
    if args.length == 2
        i0 = num(args[0])
        i1 = num(args[1]) - 1
    else
        i0 = 0
        i1 = num(args[0]) - 1
    cb null, [i0 .. i1]

# List operations

builtins.length = (inp, args, ctx, cb) -> cb null, inp.length
builtins.reverse = (inp, args, ctx, cb) -> cb null, inp.reverse()
builtins.head = (inp, args, ctx, cb) -> cb null, inp[..args[0]||50]
builtins.tail = (inp, args, ctx, cb) -> cb null, inp[inp.length-(args[0]||50)..]
builtins.join = (inp, args, ctx, cb) -> cb null, inp.join args[0] || ' '
builtins.split = (inp, args, ctx, cb) -> cb null, inp.split(args[0] || '\n')
builtins.uniq = (inp, args, ctx, cb) -> cb null, _.uniq inp
builtins.flatten = (inp, args, ctx, cb) -> cb null, _.flatten inp

builtins.sleep = (inp, args, ctx, cb) -> setTimeout cb, Number args[0]

# Environmental parasites

builtins.let = (inp, args, ctx, cb) ->
    ctx.env[args[0]] = args[1]
    cb null, ctx.env[args[0]]

# `inc` increments a number given a key
builtins.inc = (inp, args, ctx, cb) ->
    inc_key = args[0]
    ctx[inc_key] = 0 if !ctx[inc_key]?
    cb null, ++ctx[inc_key]

# `ginc` gets or increments a number given a key and object key
builtins.ginc = (inp, args, ctx, cb) ->
    inc_key = args[0]
    obj_key = args[1]
    if !ctx[inc_key]?
        ctx[inc_key] =
            val: 0
            objs: {}
    if ctx[inc_key].objs[obj_key]?
        cb null, ctx[inc_key].objs[obj_key]
    else
        obj_val = ++ctx[inc_key].val
        ctx[inc_key].objs[obj_key] = obj_val
        cb null, obj_val

# Matching, filtering

builtins.match = (inp, args, ctx, cb) ->
    if args.length == 2
        inp = args[0]
        match_with = args[1]
    else
        match_with = args[0]
    matched = []
    for i in inp
        if i.match match_with
            matched.push i
    cb null, matched
builtins.grep = builtins.match

builtins.filter = (inp, args, ctx, cb) ->
    filtered_inp = []
    if args.length > 0
        filter_code = 'return (' + args.join(' ') + ');'
        filter_func = new Function 'i', filter_code
        filtered_inp = inp.filter filter_func
    else
        # Filter out null items
        for i in inp
            filtered_inp.push(i) if i
    cb null, filtered_inp

builtins.tee = (inp, args, ctx, cb) ->
    cb null, inp

builtins.parse = (inp, args, ctx, cb) ->
    cb null, JSON.parse inp

builtins.log = (inp, args, ctx, cb) ->
    console.log args.join ' '
    cb null, inp

builtins.inspect = (inp, args, ctx, cb) ->
    console.log 'inp: ' + _inspect inp
    console.log 'args: ' + _inspect args
    cb null, inp

builtins.stringify = (inp, args, ctx, cb) ->
    cb null, JSON.stringify inp

builtins.count = (inp, args, ctx, cb) ->
    counts = {}
    for i in inp
        counts[i] = 0 if not counts[i]?
        counts[i] += 1
    counts_list = []
    for k, v of counts
        counts_list.push
            item: k
            count: v
    counts_list.sort (a, b) -> a.count - b.count
    cb null, counts_list

builtins.sort = (inp, args, ctx, cb) ->
    if sort_by = args[0]
        if sort_by[0] == '-'
            sort_by = sort_by[1..]
            cb null, inp.sort (a, b) -> b[sort_by] - a[sort_by]
        else
            cb null, inp.sort (a, b) -> a[sort_by] - b[sort_by]
    else
        cb null, inp.sort()

# Including modules

builtins.use = (inp, args, ctx, cb) ->
    for arg in args
        ctx.use arg
    cb null, 'Using: ' + args.join(', ')

builtins.alias = (inp, args, ctx, cb) ->
    ctx.alias args[0], args[1]
    cb null, success: true
