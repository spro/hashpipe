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
    (inp, args..., cb) ->
        cb null, f args...

wrapinsync = (f) ->
    (inp, args..., cb) ->
        cb null, f inp, args...

wrapasync = (f) ->
    (inp, args..., cb) ->
        f args..., cb

listargs = (f, c=' ') ->
    (inp, args..., cb) ->
        f inp, args, cb

joinedargs = (f, c=' ') ->
    (inp, args..., cb) ->
        f inp, args.join(c), cb

# Define methods
# ------------------------------------------------------------------------------

echo = wrapsync (s...) -> s.join(' ')
join = wrapinsync (s, c=' ') -> s.join(c)

list = wrapsync (items...) -> items

range = wrapsync (i0, i1) -> [i0..i1-1]

get = (inp, url, cb) ->
    request url: url, json: true, (err, res, got) ->
        cb null, got

at = (inp, key, cb) ->
    cb null, inp[key]

pick = (inp, args..., cb) ->
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

filter = (inp, f, cb) ->
    console.log 'filtering by ' + inspect f.lambda
    _execLambda = (_inp, _cb) ->
        async.reduce f.lambda, _inp, execSection, (err, result) ->
            _cb result # No err arg for filter
    async.filter inp, _execLambda, (result) -> cb null, result

methods = {
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

execScript = (script, cb) ->
    phrases = parseScript script
    console.log '[execScript]'
    console.log '    script:  ' + inspect script
    console.log '    phrases: ' + inspect phrases
    hr()
    async.reduce phrases, {}, execPhrase, cb

execPhrase = (inp, phrase, cb) ->
    async.reduce phrase, {}, execPiping, cb

execPiping = (inp, section, cb) ->
    console.log '[execSection] ' + inspect section; hr('- ')
    _execSection = (inp, cb) -> execSection inp, section, cb

    if section.type == 'map'
        async.map inp, _execSection, cb

    else if section.type == 'series'
        async.mapSeries inp, _execSection, cb

    else
        _execSection inp, cb

execSection = (inp, section, cb) ->
    if section.method?
        execMethod inp, section.method, section.args, cb

    else if section.lambda?
        async.reduce section.lambda, inp, execSection, cb

    else
        console.log '[execSection] Could not interpret section'
        evalArg inp, section, cb

execMethod = (inp, method, args, cb) ->

    if method_fn = methods[method]
        evalArgs inp, args, (err, parsed_args) ->
            method_fn inp, parsed_args..., cb

    else
        cb null, 'no such method'

evalArgs = (inp, args, cb) ->
    _evalArg = (arg, _cb) -> evalArg inp, arg, _cb
    async.map args, _evalArg, cb

evalArg = (inp, arg, cb) ->
    if arg.string?
        cb null, arg.string
    else if arg.number?
        cb null, arg.number
    else if arg.sub?
        async.reduce arg.sub, inp, execSection, cb
    else
        cb null, arg

# Repl
# ------------------------------------------------------------------------------

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
    execScript script, (err, a) ->
        console.log inspect a
        rl.prompt()

fs.readFile '.last_script', (err, last_script) ->
    if last_script?
        rl.history.push last_script.toString()

