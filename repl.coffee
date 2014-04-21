readline = require 'readline'
pipeline = require './pipeline'
builtins = require './builtins'
config = require '../gofish/config'

# Import default modules

ctx = pipeline.createContext(env: hi: name: 'fred')
    .use(require('./modules/mongo').connect(config.mongo))
    .use(require('./modules/redis').connect(config.redis))
    .use('http')
    .use('html')
    .use('files')
    .use('keywords')

fn_names = (n for n, f of ctx.fns).concat (n for n, f of builtins)
fnCompleter = (line) ->
    to_complete = line.split(' ').slice(-1)[0]
    completions = fn_names.filter ((c) -> c.indexOf(to_complete) == 0)
    return [completions, to_complete]

rl = readline.createInterface
    input: process.stdin
    output: process.stdout
    completer: fnCompleter
rl.setPrompt '> '
rl.prompt()

last_out = null
rl.on 'line', (cmd) ->
    cmd = cmd.trim()
    cmd = 'id' if !cmd.length
    try
        pipeline.execPipelines cmd, last_out, ctx, (err, out) ->
            last_out = out
            # TODO: Some more advanced output handling,
            # trim long lists with some ellipses
            console.log out
            rl.prompt()
    catch e
        console.log '[ERROR] ' + e
        rl.prompt()

