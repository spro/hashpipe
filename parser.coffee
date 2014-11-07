util = require 'util'
_ = require 'underscore'
async = require 'async'
peg = require 'pegjs'
fs = require 'fs'
{exec} = require 'child_process'
request = require('request').defaults({headers: 'user-agent': 'hashpipe'})

grammar = fs.readFileSync('grammar.peg').toString()
parser = peg.buildParser grammar

# Helpers

inspect = (o, trim=false) ->
    s = util.inspect(o, {colors: true, depth: null})
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

# Define methods
# ------------------------------------------------------------------------------

head = wrapinsync (items, n) -> items[..n-1]
tail = wrapinsync (items, n) -> items[-1*n..]

echo = wrapsync (s...) -> s.join(' ')
join = wrapinsync (s, c=' ') -> s.join(c)

list = wrapsync (items...) -> items

range = wrapsync (i0, i1) -> [i0..i1-1]

get = (ctx, inp, url, cb) ->
    request url: url, json: true, (err, res, got) ->
        cb null, got

at = (ctx, inp, key, cb) ->
    cb null, inp[key]

pick = (ctx, inp, args..., cb) ->
    cb null, _.pick inp, args

times = wrapinsync (a, b) -> a * b
pow = wrapinsync (a, b) -> Math.pow a, b
divide = wrapinsync (a, b) -> a / b
modulo = wrapinsync (a, b) -> a % b
plus = wrapinsync (a, b) -> a + b
minus = wrapinsync (a, b) -> a - b
eq = wrapinsync (inp, to) -> inp == to
gt = wrapinsync (inp, to) -> inp > to
lt = wrapinsync (inp, to) -> inp < to

sum = wrapinsync (a) -> a.reduce (a, b) -> a + b

trim = wrapinsync (s) -> s.trim()
split = wrapinsync (s, d='\n') ->
    s.split(d)
length = wrapinsync (s) -> s.length

filter = (ctx, inp, f, cb) ->
    console.log 'filtering by ' + inspect f.lambda
    _execSection = (_inp, _section, _cb) ->
        execSection ctx, _inp, _section, _cb
    _execLambda = (_inp, _cb) ->
        async.reduce f.lambda, _inp, _execSection, (err, result) ->
            _cb result # No err arg for filter
    async.filter inp, _execLambda, (result) -> cb null, result

set = (ctx, inp, v, cb) ->
    ctx.vars[v] = inp
    cb null, inp

methods = {
    set
    head
    tail
    echo
    join
    range
    get
    at
    list
    sum
    trim
    split
    length
    filter
    pluck: wrapinsync _.pluck
    pick: listargs wrapinsync _.pick
    exec: joinedargs wrapasync exec
    sort: wrapinsync _.sortBy
    '*': times
    '**': pow
    '/': divide
    '%': modulo
    '+': plus
    '-': minus
    '>': gt
    '<': lt
    '==': eq
}

# Parsing
# ------------------------------------------------------------------------------

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

readline = require 'readline'
rl = readline.createInterface
    input: process.stdin
    output: process.stdout

rl.setPrompt ' ~> '

# Interpret input as scripts and run
rl.prompt()
rl.on 'line', (script) ->
    script = script.trim()
    fs.writeFile '.last_script', script, ->
    script = 'id' if !script.length
    hr('=')
    execScript context, {}, script, (err, a) ->
        console.log inspect a
        rl.prompt()

fs.readFile '.last_script', (err, last_script) ->
    if last_script?
        rl.history.push last_script.toString()

