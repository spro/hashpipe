#!/usr/bin/env coffee
readline = require 'readline'
readline_vim = require 'readline-vim'
{Pipeline} = require './pipeline'
moment = require 'moment'
builtins = require './builtins'
ansi = require('ansi')(process.stdout)
{prettyPrint} = require './helpers'
fs = require 'fs'
path = require 'path'
_ = require 'underscore'
argv = require('minimist')(process.argv)

# Helper functions

getHomeDir = ->
    return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE

process.on 'SIGTERM', ->
    console.log 'sigterm'
    process.exit()
process.on 'SIGINT', ->
    console.log 'sigint'
    process.exit()

# Import default modules

PipelineREPL = (@pipeline) ->
    if !@pipeline
        @pipeline = defaultPipeline()

    # Keep a consistent context for the REPL
    @context = @pipeline.subScope()

    # Add command line arguments as variables
    base_env = _.omit(argv, '_')
    _.forEach base_env, (v, k) =>
        @context.set('vars', k, v)

    # Keep track of last response
    @last_out = null
    return @

defaultPipeline = ->
    new Pipeline()
        #.use(require('./modules/mongo').connect())
        #.use(require('./modules/redis').connect())
        .use('http')
        .use('html')
        .use('files')
        .use('keywords')

PipelineREPL::writeSuccess = (data) ->
    if data?
        if @plain
            console.log data
        else
            console.log prettyPrint data

PipelineREPL::writeError = (err) ->
    ansi.fg['red']()
    console.log '[ERROR] ' + err
    ansi.reset()

PipelineREPL::executeScript = (script, cb) ->
    try
        @pipeline.exec script, @last_out, @context, (err, data) =>
            @last_out = data
            # TODO: Some more advanced output handling,
            # trim long lists with some ellipses
            if err?
                @writeError err
            else
                @writeSuccess data
            cb() if cb?

    catch e
        @writeError e
        cb() if cb?

PipelineREPL::startReadline = ->
    repl = @

    # Set up readline prompt
    fn_names = (n for n, f of repl.pipeline.fns).concat (n for n, f of builtins)
    fnCompleter = (line) ->
        line_parts = line.trim().split(/\s+/)
        to_complete = line_parts.slice(-1)[0]
        startsWith = (sofar) -> (s) -> s.toLowerCase().indexOf(sofar.toLowerCase()) == 0
        file_commands = ['ls', 'cp', 'mv', 'ln', 'cd', 'cat', 'vim', 'coffee', 'python', 'git', 'open']
        if to_complete.match '/'
            base_dir = to_complete.split('/').slice(0,-1).join('/')
            last_part = to_complete.split('/').slice(-1)[0]
            to_complete = last_part
            completions = fs.readdirSync(base_dir).filter startsWith last_part
        else
            completions = fs.readdirSync('.').filter startsWith to_complete
        if line_parts[0] not in file_commands
            completions = completions.concat fn_names.filter startsWith to_complete
        return [completions, to_complete]

    rl = readline.createInterface
        input: process.stdin
        output: process.stdout
        completer: fnCompleter
    rlv = readline_vim(rl)
    @rl = rl
    @context._readline = rl

    # Overload readline's addHistory to save to our history file
    rl_addHistory = rl._addHistory
    rl._addHistory = ->
        last = rl.history[0]
        line = rl_addHistory.call(rl)
        saveHistory(line) if last != line
        return line

    # Bootstrap history from file
    loadHistory (err, saved_history) ->
        rl.history.push.apply(rl.history, saved_history)

    @updatePrompt()
    rl.prompt()

    # Interpret input as scripts and run
    run_once = @run_once || !process.stdin.isTTY
    rl.on 'line', (script) =>
        script = script.trim()
        script = 'id' if !script.length
        repl.executeScript script, =>
            if run_once
                if script_exec = argv.exec || argv.e
                    repl.executeScript script_exec, ->
                        process.exit()
                else
                    process.exit()
            else
                @updatePrompt()
                rl.prompt()

    rl.on 'close', ->
        console.log 'bye'
        process.exit()

# Prompt helpers

colorize = (s, color) ->
    prefix = '\x1b[' + color + 'm'
    suffix = '\x1b[0m'
    prefix + s + suffix
PipelineREPL::updatePrompt = ->
    time = '[' + moment().format('HH:mm') + ']'
    cwd = process.cwd().replace process.env.HOME, '~'
    parts = [
        colorize(time, 90)
        colorize(cwd, 34)
        colorize('#| ', 36)
    ].join ' '
    @rl.setPrompt parts

# History helpers

history_path = path.resolve getHomeDir(), '.pipeline_history'

saveHistory = (line) ->
    fs.appendFileSync history_path, line + '\n'

loadHistory = (cb) ->
    fs.readFile history_path, (err, history_data) ->
        return cb null, [] if !history_data
        history_lines = history_data.toString().trim().split('\n')
        history_lines.reverse()
        cb null, history_lines

# Going

if require.main != module
    # Module mode
    module.exports = PipelineREPL

else
    # Stand-alone mode
    repl = new PipelineREPL

    if argv.plain || argv.p
        repl.plain = true

    if script_filename = argv.run || argv.r
        doRunScript = ->
            # Execute single script
            script = fs.readFileSync(script_filename).toString()
            setTimeout ->
                repl.executeScript script, ->
                    process.exit()
            , 50

        if !process.stdin.isTTY
            # Try reading in piped
            piped = ''
            process.stdin.on 'data', (data) ->
                piped += data.toString()
            process.stdin.on 'end', ->
                repl.last_out = piped.trim()
                doRunScript()
        else
            doRunScript()

    else if script_filename = argv.load || argv.l
        # Execute single script
        console.log "Reading from #{ script_filename }..."
        script = fs.readFileSync(script_filename).toString()
        setTimeout ->
            repl.executeScript script, ->
                repl.startReadline()
        , 50

    else
        repl.startReadline()

