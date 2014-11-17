parser = null
$.get '/grammar.peg', (grammar) ->
    parser = PEG.buildParser grammar

# Helpers

inspect = (o, trim=false) ->
    s = JSON.stringify(o)
    s = s.replace(/\n/g, '') if trim
    return s

makeBar = (n, c) -> (c for i in [0..n-1]).join('')
hr = (c='-') -> console.log makeBar 80/c.length, c

# Test script
# ------------------------------------------------------------------------------

repos_subpipe = """
get https://api.github.com/users/substack/repos
    || ( pluck url | split "/" | tail 3 | join "...")
"""

# Method wrappers
# ------------------------------------------------------------------------------

wrapsync = (f) ->
    (ctx, inp, args..., cb) ->
        cb null, f args...

wrapinsync = (f) ->
    (ctx, inp, args..., cb) ->
        cb null, f inp, args...

wrapasync = (f) ->
    (ctx, inp, args..., cb) ->
        f args..., cb

listargs = (f, c=' ') ->
    (ctx, inp, args..., cb) ->
        f inp, args, cb

joinedargs = (f, c=' ') ->
    (ctx, inp, args..., cb) ->
        f inp, args.join(c), cb

# Methods
# ==============================================================================

methods = {}

# Helper for using underscore methods
useUnderscoreMethods = (ms, wrapper=wrapinsync) ->
    _.extend methods, mapObj(_.pick(_, ms), wrapper)

methods.id = wrapinsync (v) -> v
methods.val = wrapsync (v) -> v

# Strings
# ------------------------------------------------------------------------------

methods.echo = wrapsync (s...) -> s.join(' ')
methods.join = wrapinsync (s, c=' ') -> s.join(c)
methods.trim = wrapinsync (s) -> s.trim()
methods.split = wrapinsync (s, d='\n') -> s.split(d)
methods.length = wrapinsync (s) -> s.length

# Objects
# ------------------------------------------------------------------------------

# Object generator

methods.obj = wrapsync (items...) ->
    _.object _.values _.groupBy items, (e, i) -> Math.floor i/2

# Object operations

# Get an attribute of an object o[attr] if attr is a string, or
# descend into the object o[attr[0]][attr[1]][...] if attr is an array
getAttr = (o, attr) ->
    if _.isArray attr
        attr.reduce getAttr, o
    else o[attr]

# Map a function over an object's values, preserving the key structure
mapObj = (o, f) ->
    _o = {}
    for k, v of o
        _o[k] = f v
    return _o

methods.at = (ctx, inp, attr..., cb) ->
    cb null, getAttr inp, attr

methods.pick = listargs wrapinsync _.pick
useUnderscoreMethods ['keys', 'values', 'pairs']
methods.unpairs = wrapinsync _.object # Better name to avoid confusion with obj

# Lists
# ------------------------------------------------------------------------------

# List generators

methods.list = wrapsync (items...) -> items
methods.range = wrapsync (i0, i1) -> [i0..i1-1]

# List operations

methods.reverse = wrapinsync (items) -> items.reverse()
methods.head = wrapinsync (items, n) -> items[..n-1]
methods.tail = wrapinsync (items, n) -> items[-1*n..]
useUnderscoreMethods [
    'where', 'findWhere', 'pluck',
    'sortBy', 'groupBy', 'indexBy', 'countBy',
    'shuffle', 'sample'
]

# HTTP
# ------------------------------------------------------------------------------

methods.get = (ctx, inp, url, cb) ->
    remote 'fetcher', 'fetch', url, cb

methods.post = (ctx, inp, url, cb) ->
    $.post url, inp, (data) -> cb null, data

# Math
# ------------------------------------------------------------------------------

methods['*'] = times = wrapinsync (a, b) -> a * b
methods['**'] = pow = wrapinsync (a, b) -> Math.pow a, b
methods['/'] = divide = wrapinsync (a, b) -> a / b
methods['%'] = modulo = wrapinsync (a, b) -> a % b
methods['+'] = plus = wrapinsync (a, b) -> a + b
methods['-'] = minus = wrapinsync (a, b) -> a - b
methods['>'] = gt = wrapinsync (inp, to) -> inp > to
methods['<'] = lt = wrapinsync (inp, to) -> inp < to
methods['=='] = eq = wrapinsync (inp, to) -> inp == to
methods.round = wrapinsync (a) -> Math.round a
methods.sum = wrapinsync (a) -> a.reduce (a, b) -> a + b

# Filtering
# ------------------------------------------------------------------------------

methods.filter = (ctx, inp, f, cb) ->
    console.log 'filtering by ' + inspect f.lambda
    _execSection = (_inp, _section, _cb) ->
        execSection ctx, _inp, _section, _cb
    _execLambda = (_inp, _cb) ->
        async.reduce f.lambda, _inp, _execSection, (err, result) ->
            _cb result # No err arg for filter
    async.filter inp, _execLambda, (result) -> cb null, result

methods.filterValues = (ctx, inp, f, cb) ->
    console.log 'filtering by ' + inspect f.lambda
    _execSection = (_inp, _section, _cb) ->
        execSection ctx, _inp, _section, _cb
    _execLambda = ([k, _inp], _cb) ->
        async.reduce f.lambda, _inp, _execSection, (err, result) ->
            _cb [k, result] # No err arg for filter
    async.filter _.pairs(inp), _execLambda, (result_pairs) -> cb null, _.object result_pairs

# Context manipulation
# ------------------------------------------------------------------------------

methods.set = (ctx, inp, v, cb) ->
    ctx.vars[v] = inp
    cb null, inp

# More underscore methods

useUnderscoreMethods ['isArray', 'isObject', 'isFunction', 'isString', 'isNumber', 'isBoolean', 'isDate', 'isNull']

# Etc.

methods.sleep = wrapasync (n, cb) -> setTimeout cb, n

# Views

methods.showimg = (ctx, inp, args..., cb) ->
    console.log 'inp would be', inp
    console.log 'cb would be', cb
    cb null, $("<img src='#{ inp }' />")[0]

# Parsing
# ==============================================================================

parseScript = (script) ->
    parsed = parser.parse script

execScript = (ctx, inp, script, cb) ->
    phrases = parseScript script
    console.log '[execScript]'
    console.log '    script:  ' + inspect script
    console.log '    phrases: ' + inspect phrases
    hr()
    _execPhrase = (_inp, _phrase, _cb) ->
        execPhrase ctx, _inp, _phrase, _cb
    async.reduce phrases, inp, _execPhrase, cb

execPhrase = (ctx, inp, phrase, cb) ->
    console.log '[execPhrase] ' + inspect phrase; hr('- ')
    _execPiping = (_inp, _section, _cb) ->
        execPiping ctx, _inp, _section, _cb
    async.reduce phrase, inp, _execPiping, cb

execPiping = (ctx, inp, section, cb) ->
    console.log '[execSection] ' + inspect section; hr('- ')
    _execSection = (_inp, cb) -> execSection ctx, _inp, section, cb

    if section.type == 'map'
        async.map inp, _execSection, cb

    else if section.type == 'series'
        async.mapSeries inp, _execSection, cb

    else
        _execSection inp, cb

execSection = (ctx, inp, section, cb) ->
    if section.method?
        execMethod ctx, inp, section.method, section.args, cb

    else if section.lambda?
        _execSection = (_inp, _section, _cb) ->
            execSection ctx, _inp, _section, _cb
        async.reduce section.lambda, inp, _execSection, cb

    else
        console.log '[execSection] Could not interpret section'
        evalArg ctx, inp, section, cb

execMethod = (ctx, inp, method, args, cb) ->

    if alias = ctx.aliases[method]
        execScript ctx, inp, alias, cb

    else if method_fn = methods[method]
        evalArgs ctx, inp, args, (err, parsed_args) ->
            method_fn ctx, inp, parsed_args..., cb

    else
        cb null, 'no such method'

evalArgs = (ctx, inp, args, cb) ->
    _evalArg = (arg, _cb) -> evalArg ctx, inp, arg, _cb
    async.map args, _evalArg, cb

evalArg = (ctx, inp, arg, cb) ->
    if arg.number?
        cb null, arg.number
    else if arg.string?
        invars = arg.string.match(/\$\w+/g) || []
        invars = invars.map((s) -> s.slice(1))
        cb null, replaceVars ctx, inp, invars, arg.string
    else if arg.var?
        cb null, ctx.vars[arg.var]
    else if arg.inp?
        cb null, inp
    else if arg.sub?
        _execSection = (_inp, _section, _cb) ->
            execSection ctx, _inp, _section, _cb
        async.reduce arg.sub, inp, _execSection, cb
    else
        cb null, arg

replaceVars = (ctx, inp, vars, string) ->
    replaced = vars.reduce ((s, v) -> s.replace '$'+v, ctx.vars[v]), string
    replaced = replaced.replace '$!', inp

# Repl
# ------------------------------------------------------------------------------

context =
    aliases:
        foo: 'echo test'
        foo2: 'echo test $( foo )'
    vars:
        bar: 7

# Export things

_.extend window, {
    parser
    context
    methods
    execScript
}

