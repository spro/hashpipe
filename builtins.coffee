fs = require 'fs'
_ = require 'underscore'
util = require 'util'
_inspect = (o) -> util.inspect o, depth: null
helpers = require './helpers'

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
    else
        return !!v

exists = (v) -> v?

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
builtins.echo = (inp, args, ctx, cb) ->
    cb null, args.join(' ')

# `key` is `echo` without spaces, useful for building keys
# key "a" ":b:" "c" -> "a:b:c"
builtins.key = (inp, args, ctx, cb) -> cb null, args.join('')

# `num` coerces input into a number
# val -> num -> #val
builtins.num = (inp, args, ctx, cb) -> cb null, num inp

# `bool` coerces input into a boolean
# val -> bool -> val?
builtins.bool = (inp, args, ctx, cb) -> cb null, bool inp

# `if [test] [value]`
# Returns the value if the test is true, otherwise nothing
# Not actually very useful
builtins.if = (inp, args, ctx, cb) ->
    if args[0]
        cb null, args[1]
    else
        cb()

# `case [key] {cases}`
# Use key as a conditional or case; looks in a cases dictionary to decide what
# to return. Ideally there's something more syntactic and less forcedly
# functional to fill this case. A big problem in this case is you can't use it
# to branch because it can only return computed values. Then again it would be
# almost impossible to write a good multi-case script in one line.
builtins.case = (inp, args, ctx, cb) ->
    _case = args[0]
    cases = args[1]
    cb null, cases[_case]

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

# range #start? #stop -> [#i]
builtins.range = (inp, args, ctx, cb) ->
    if args.length == 2
        i0 = num(args[0])
        i1 = num(args[1]) - 1
    else
        i0 = 0
        i1 = num(args[0]) - 1
    cb null, [i0 .. i1]

# String operations

builtins.upper = (inp, args, ctx, cb) -> cb null, inp.toUpperCase()
builtins.lower = (inp, args, ctx, cb) -> cb null, inp.toLowerCase()

# List operations

builtins.length = (inp, args, ctx, cb) -> cb null, inp.length
builtins.reverse = (inp, args, ctx, cb) ->
    if typeof inp == 'string'
        cb null, inp.split('').reverse().join('')
    else
        cb null, inp.reverse()
builtins.head = (inp, args, ctx, cb) -> cb null, inp[..(args[0]||50)-1]
builtins.tail = (inp, args, ctx, cb) ->
    count = args[0]
    count = 50 if !count?
    if count < 1
        cb null, []
    else
        cb null, inp[inp.length-count..]
builtins.join = (inp, args, ctx, cb) -> cb null, inp.join args[0] || ' '
builtins.split = (inp, args, ctx, cb) -> cb null, inp.split(args[0] || '\n')
builtins.uniq = (inp, args, ctx, cb) -> cb null, _.uniq inp
builtins.flatten = (inp, args, ctx, cb) -> cb null, _.flatten inp

builtins.trim = (inp, args, ctx, cb) -> cb null, (args[0] || inp).trim()

builtins.sleep = (inp, args, ctx, cb) ->
    setTimeout (-> cb null, inp), Number args[0]

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

# Pass through without altering input (isn't this id?)
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

builtins.sort = (inp, args, ctx, cb) ->
    if sort_by = args[0]
        if sort_by[0] == '-'
            sort_by = sort_by[1..]
            cb null, inp.sort (a, b) -> b[sort_by] - a[sort_by]
        else
            cb null, inp.sort (a, b) -> a[sort_by] - b[sort_by]
    else
        cb null, inp.sort()

builtins.count = (inp, args, ctx, cb) ->
    counts = {}
    ki = {}
    if args[0]?
        ik = (i) -> i[args[0]]
    else
        ik = (i) -> i
    for i in inp
        counts[ik i] = 0 if not counts[ik i]?
        counts[ik i] += 1
        ki[ik i] = i
    counts_list = []
    for k, v of counts
        counts_list.push
            item: ki[k]
            count: v
    counts_list.sort (a, b) -> a.count - b.count
    cb null, counts_list

builtins.bin = (inp, args, ctx, cb) ->
    count = Number args[0]
    key = args[1]

    ki = {}
    if key?
        ik = (i) -> i[key]
    else
        ik = (i) -> i

    min = null
    max = null
    bins = []

    for item in inp
        k = ik item
        if !min? || k < min
            min = k
        if !max? || k > max
            max = k + 0.000000001

    interval = ( max - min ) / count

    for i in [0..count-1]
        bins.push
            start: i * interval + min
            end: ( i + 1 ) * interval + min
            count: 0
            items: []

    for item in inp
        bi = Math.floor( ( (ik item) - min ) / interval )
        bins[bi].items.push item
        bins[bi].count += 1

    cb null, bins

builtins.chunks = (inp, args, ctx, cb) ->
    n = args[0] || 10
    cs = ([] for i in [0..n-1])
    for i in [0..inp.length-1]
        ci = Math.floor(i / n)
        cs[ci].push inp[i]

    cb null, cs

builtins.slice = (inp, args, ctx, cb) ->
    a = args[0] || 0
    b = args[1] || inp.length
    cb null, inp.slice(a, b)

builtins.now = (inp, args, ctx, cb) -> cb null, new Date
builtins.timestamp = (inp, args, ctx, cb) -> cb null, new Date().getTime()
builtins['oid-timestamp'] = (inp, args, ctx, cb) -> cb null, (parseInt((args[0] || inp).toString().substring(0, 8), 16) * 1000)

randstr = (len=5) ->
    s = ''
    while s.length < len
        s += Math.random().toString(36).slice(2, len-s.length+2)
    return s

randint = (max=100) ->
    return Math.floor(Math.random() * max)
builtins.randstr = (inp, args, ctx, cb) -> cb null, randstr args[0]
builtins.randint = (inp, args, ctx, cb) -> cb null, randint args[0]

builtins.randomChoice = (inp, args, ctx, cb) ->
    cb null, _.sample(inp, 1)[0]
builtins.randomSample = (inp, args, ctx, cb) ->
    cb null, _.sample inp, args[0] || inp.length/2

# Array functions

builtins.zip = (inp, args, ctx, cb) ->
    if _.every args, _.isArray
        cb null, _.zip args...
    else # split one list of args into two
        args.push null if args.length%2 == 1
        l1 = _.first args, args.length/2
        l2 = _.last args, args.length/2
        cb null, _.zip l1, l2

builtins.zipobj = (inp, args, ctx, cb) ->
    builtins.zip inp, args, ctx, (err, zipped) ->
        cb null, _.object zipped

# Underscore methods
# ------------------------------------------------------------------------------

umethods = _.pick(_, [
    'extend', 'keys', 'values', 'pairs', 'pick', 'omit',
    'where', 'findWhere',
    'sortBy', 'groupBy', 'indexBy', 'countBy',
    'shuffle'
])
# Wrap them using `sync` and `with_inp` options
_.extend builtins, helpers.wrapall umethods, '', true, true

# Modifying the environment
# ------------------------------------------------------------------------------

builtins.set = (inp, args, ctx, cb) ->
    data = args[1] || inp
    ctx.set 'vars', args[0], data
    cb null, data

builtins.setall = (inp, args, ctx, cb) ->
    data = args[1] || inp
    for k, v of data
        ctx.set 'vars', k, v
    cb null, data

# `inc` increments a number given a key
builtins.inc = (inp, args, ctx, cb) ->
    inc_key = args[0]
    ctx[inc_key] = 0 if !ctx[inc_key]?
    cb null, ++ctx[inc_key]

# `push` adds input to the end of the specified array
builtins.push = (inp, args, ctx, cb) ->
    data = args[1] || inp
    l = ctx.get('vars', args[0]) || []
    l.push data
    ctx.set('vars', args[0], l)
    cb null, l

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

# Including modules

builtins.use = (inp, args, ctx, cb) ->
    for arg in args
        ctx.topScope().use arg
    cb null, 'Using: ' + args.join(', ')

builtins.alias = (inp, args, ctx, cb) ->
    alias = args[0]
    script = args[1]
    if !script
        # Showing an alias
        cb null, ctx.get 'aliases', alias
    else
        # Setting an alias
        ctx.alias alias, script
        cb null,
            success: true
            alias: alias
            script: script

builtins.aliases = (inp, args, ctx, cb) ->
    if !inp
        # Showing aliases
        cb null, ctx.get 'aliases'
    else
        # Setting aliases
        for alias, script of inp
            ctx.alias alias, script
        cb null,
            success: true
            aliases: inp
