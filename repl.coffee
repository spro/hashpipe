readline = require 'readline'
pipeline = require './pipeline'
builtins = require './builtins'

builtin_names = (n for n, f of builtins)
builtinCompleter = (line) ->
    to_complete = line.split(' ').slice(-1)[0]
    completions = builtin_names.filter ((c) -> c.indexOf(to_complete) == 0)
    return [completions, to_complete]

rl = readline.createInterface
    input: process.stdin
    output: process.stdout
    completer: builtinCompleter
rl.setPrompt '> '
rl.prompt()

rl.on 'line', (cmd) ->
    pipeline.exec_pipeline cmd, {}, {}, (err, out) ->
        console.log out
        rl.prompt()
