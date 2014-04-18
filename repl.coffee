readline = require 'readline'
pipeline = require './pipeline'

rl = readline.createInterface process.stdin, process.stdout
rl.setPrompt '> '
rl.prompt()

rl.on 'line', (cmd) ->
    pipeline.exec_pipeline cmd, {}, {}, (err, out) ->
        console.log out
        rl.prompt()

