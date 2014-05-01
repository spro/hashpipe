readline = require 'readline'
pipeline = require './pipeline'
builtins = require './builtins'
ansi = require('ansi')(process.stdout)
{stringify} = require './helpers'
fs = require 'fs'

# Import default modules

ctx = pipeline.createContext()
    .use(require('./modules/mongo').connect())
    .use(require('./modules/redis').connect())
    .use('http')
    .use('html')
    .use('files')
    .use('keywords')

last_out = null

writeSuccess = (data) ->
    ansi.fg['green']()
    console.log stringify data
    ansi.reset()

writeError = (err) ->
    ansi.fg['red']()
    console.log '[ERROR] ' + err
    ansi.reset()

executeScript = (script, cb) ->
    try
        pipeline.execPipelines script, last_out, ctx, (err, data) ->
            last_out = data
            # TODO: Some more advanced output handling,
            # trim long lists with some ellipses
            if err?
                writeError err
            else
                writeSuccess data
            cb() if cb?

    catch e
        writeError e
        cb() if cb?

if process.argv.length > 2
    # Execute single script
    script_filename = process.argv[2]
    script = fs.readFileSync(script_filename).toString()
    setTimeout ->
        executeScript script, ->
            process.exit()
    , 1500

else
    # Set up readline prompt
    fn_names = (n for n, f of ctx.fns).concat (n for n, f of builtins)
    fnCompleter = (line) ->
        to_complete = line.split(' ').slice(-1)[0]
        completions = fn_names.filter ((c) -> c.indexOf(to_complete) == 0)
        return [completions, to_complete]

    rl = readline.createInterface
        input: process.stdin
        output: process.stdout
        completer: fnCompleter
    rl.setPrompt 'Q > '
    rl.prompt()

    rl.on 'line', (script) ->
        script = script.trim()
        script = 'id' if !script.length
        executeScript script, ->
            rl.prompt()

