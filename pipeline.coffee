parser = require './parser'
builtins = require './builtins'
async = require 'async'
fs = require 'fs'
util = require 'util'
_ = require 'underscore'

DEBUG = false

# Grab some tools before you dig in
recv_ = (t, s) -> console.log "[#{ t.toUpperCase() }] #{ s }"
_inspect = (o) -> util.inspect o, depth: null
inspect = (o) -> console.log _inspect o

# Create a context that can be extended with `.use`

class Scope

    constructor: (init={}) ->
        _.extend @, init
        return @

    # Set a value on the current scope
    set: (t, k, v) ->
        if DEBUG
            console.log "[Scope set] Setting #{ t } #{ k } to #{ v }"
        @[t] = {} if !@[t]?
        @[t][k] = v

    # Get a value from the current scope, falling back to parent scope
    get: (t, k) ->
        if DEBUG
            console.log "[Scope get] Getting #{ t } #{ k }"
        @[t]?[k] || @parent?.get t, k

    # Set an alias on the highest ranking scope
    alias: (a, s) ->
        if @parent?
            @parent.alias a, s
        else
            @set 'fns', a, through s
            @set 'aliases', a, s

    # Create a new child scope for this scope
    subScope: (init={}) ->
        init.parent = @
        return new Scope init

    topScope: ->
        if @parent?
            @parent.topScope()
        else
            @

class Context extends Scope


class Pipeline extends Scope

    use: (fns) ->
        # Module name
        if _.isString fns
            if fns.match /^\w/
                fns = './modules/' + fns
            for k, v of require(fns)
                @set 'fns', k, v
        # Object of functions
        else if _.isObject fns
            for k, v of fns
                @set 'fns', k, v
        return @ # for chaining

    # Execute a pipeline given a command string, input object,
    # context and callback. An empty context object is created
    # if none is given.

    # exec script, cb
    # exec script, inp, cb
    # exec script, inp, ctx, cb

    exec: (script, inp, ctx, cb) ->
        if !cb?
            cb = ctx
            ctx = @subScope()
        if !cb?
            cb = inp
            inp = null
        try
            pipelines = parsePipelines(script)
        catch e
            cb "Error parsing pipeline: " + e
        try
            runPipelines pipelines, inp, ctx, cb
        catch e
            cb "Error executing pipeline: " + e
        return ctx

    execFile: (script_filename, inp, cb) ->
        script = fs.readFileSync(script_filename).toString()
        @exec script, inp, cb

# Parse a command pipeline into a series of tokens
# that can be passed to `runPipeline`

parsePipelines = (cmd) ->
    parser.parse cmd

# Execute a parsed command pipeline, executing each part
# recursively by setting a callback that is either the next
# command in line or a final "stdout" callback

#        /~+~+~+~+~+~+~+~+~+~+~+~+~+\
#       |  PROCEED AT YOUR OWN RISK  |
#       |       dragons afoot        |
#        \+~+~+~+~+~+~+~+~+~+~+~+~+~/ 

runPipelines = (pipelines, inp, ctx, cb) ->
    if pipelines.length > 1
        _runPipeline = (_pipeline, _cb) ->
            runPipeline _pipeline, inp, ctx, _cb
        async.mapSeries pipelines, _runPipeline, (err, results) ->
            cb null, results.slice(-1)[0]
    else runPipeline pipelines[0], inp, ctx, cb

runPipeline = (_cmd_tokens, inp, ctx, final_cb) ->
    if DEBUG
        console.log '\n=== RUNNING PIPELINE ==='
        inspect inp
        console.log ' ---> '
        inspect _cmd_tokens
        console.log '========================\n'
    cmd_tokens = _.clone _cmd_tokens
    cmd_token = cmd_tokens.shift()
    cmd_args = cmd_token.cmd
    cmd_type = cmd_token.type
    cmd_args = ['id'] if !cmd_args

    # Replace sub-commands and variables
    parseArgs = (inp, args, cb) ->
        if DEBUG
            console.log 'parsing args for ' + _inspect inp
            console.log ':::> ' + _inspect args

        if cmd_args[0] == 'alias'
            return cb null, args

        replaceArg = (arg, _cb) ->
            if _.isObject arg
                if arg.sub?
                    return runPipelines arg.sub, inp, ctx, _cb
                else if arg.quoted?
                    return parseArgs inp, arg.quoted, (err, qargs) ->
                        _cb null, qargs.join(' ')
            else if _.isString(arg)
                if arg == '$!'
                    arg = inp
                # Int replacement
                else if $key = arg.match /^-?[0-9]+$/
                    arg = parseInt arg
                # Full replacement
                else if $key = arg.match /^\$[a-zA-Z0-9_-]+$/
                    $key = $key[0]
                    key = $key.slice(1)
                    arg = ctx.get 'vars', key
                # Non replacement (escaped)
                else if $key = arg.match /\\\$[a-zA-Z0-9_-]*$/
                    arg = $key[0].slice(1)
                # Within string replacement
                else if $key = arg.match /\$[a-zA-Z0-9_-]+/
                    $key = $key[0]
                    key = $key.slice(1)
                    arg = arg.replace $key, ctx.get 'vars', key
            _cb null, arg

        async.map args, replaceArg, (err, new_args) ->
            cb null, new_args

    # Apply an at expression at the end
    applyAt = (data, cb) ->
        if cmd_token.at?
            if cmd_type in ['ppipe', 'spipe']
                _at = (_data, _cb) ->
                    at _data, cmd_token.at, ctx, _cb
                async.map data, _at, cb
            else
                at data, cmd_token.at, ctx, cb
        else
            cb null, data

    # Check if we're at the final step
    if cmd_tokens.length == 0
        cb = (err, ret) ->
            if DEBUG
                console.log ' ===> ' + _inspect ret
            applyAt ret, final_cb

    # Create a callback to continue the pipeline otherwise
    else cb = (err, ret) ->
        applyAt ret, (err, ret) ->
            runPipeline cmd_tokens, ret, ctx, final_cb

    # Parse arguments and then execute

    # Parallel if ppiped
    if cmd_type == 'ppipe'
        console.log('PPIPE: ' + _inspect cmd_args) if DEBUG
        tasks = inp.map (_inp) ->
            (_cb) ->
                parseArgs _inp, cmd_args, (err, args) ->
                    doCmd args, _inp, ctx, _cb
        async.parallel tasks, cb

    # Series if spiped
    else if cmd_type == 'spipe'
        console.log('SPIPE: ' + _inspect cmd_args) if DEBUG
        tasks = inp.map (_inp) ->
            (_cb) ->
                parseArgs _inp, cmd_args, (err, args) ->
                    doCmd args, _inp, ctx, _cb
        async.series tasks, cb

    # Return literal value (number or string) if $val
    else if cmd_token.val?
        console.log('VAL: ' + _inspect cmd_args) if DEBUG
        parseArgs inp, [cmd_token.val], (err, parsed) ->
            cb null, parsed[0]

    # Return variable value if $var
    else if cmd_token.var?
        console.log('VAR: ' + _inspect cmd_args) if DEBUG
        $key = cmd_token.var
        if $key == '$!'
            val = inp
        else
            key = $key.slice(1)
            val = ctx.get 'vars', key
        cb null, val

    # Just execute if single piped
    else
        console.log('PIPE: ' + _inspect cmd_args) if DEBUG
        parseArgs inp, cmd_args, (err, args) ->
            doCmd args, inp, ctx, cb

# Execute a given command by looking in `ctx.fns` for a function
# called `[cmd]` and passing that function the split arguments

doCmd = (_args, inp, ctx, cb) ->
    if DEBUG
        console.log '\n##### DO CMD ######'
        inspect _args
        inspect inp
        console.log '###################\n'
    args = _.clone _args
    cmd = args.shift()
    if fn = builtins[cmd]
        fn(inp, args, ctx, cb)
    else if fn = ctx.get 'fns', cmd
        fn(inp, args, ctx, cb)
    else
        cb "No command #{ cmd }. "

# Splits a string into "arguments" by separating with whitespace
# while attempting to treat quoted strings as single arguments.
# TODO: Make a more robust parser that can handle escaping, etc.

splitArgs = (s) ->
    args = []
    s.trim().replace /"([^"]*)"|'([^']*)'|(\S+)/g, (g0,g1,g2,g3) ->
        args.push(g1 || g2 || g3 || '')
    return args

# Map a function into array of arrays at a certain depth
mapInto = (l, f, d, cb) ->
    if d == 1
        async.map l, f, cb
    else
        _into = (_l, _cb) -> mapInto _l, f, d - 1, _cb
        async.map l, _into, cb

#   , \-._ >._,_     _,_.< _.-/
#   (   )  \(-='(     )`--)/  (   _    
#    `\-\_/-')\/'     `\/(`-\_/-/' `   
#     <`)_--(_\_       _/_)--_('> 

# Take an object and an expression and follow the expression
# tree down to the desired result
descendObj = (_obj, _expr, ctx, final_cb) ->

    # This is me hoping Node has really good GC
    obj = _.clone _obj
    expr = _.clone _expr

    step = expr.shift()
    if DEBUG
        console.log "\n/ - - ~ @ ~ - - \\"
        inspect obj
        console.log "      == @ ==> "
        inspect step
        console.log "\\ - - ~ @ ~ - - /\n"

    # Check if we're at the final step
    if expr.length == 0
        cb = final_cb

    else cb = (err, ret) ->
        descendObj ret, expr, ctx, final_cb

    if !step?
        cb null, obj

    # Map attributes
    if step.map?
        map_get = (__obj, _cb) ->
            descendObj __obj, [{get: step.map}], ctx, _cb
        mapInto obj, map_get, step.depth, cb

    # Substitution
    else if step.sub?
        runPipelines step.sub, obj, ctx, cb

    # Array result
    else if _.isArray step.get
        tasks = step.get.map (step_expr) ->
            (_cb) -> descendObj obj, step_expr, ctx, _cb
        async.parallel tasks, cb

    # Object result
    else if _.isObject(step.get) && step.get.obj?

        tasks = []
        for set in step.get.obj
            do (set) ->
                k = set.key
                e = set.val

                if _.isString k
                    # Key is a string, just get value
                    tasks.push (_cb) ->
                        descendObj obj, e, ctx, (err, v_obj) ->
                            dobj =
                                key: k
                                val: v_obj
                            _cb null, dobj
                else
                    # Key is an expression, get both key value and value value
                    tasks.push (_cb) ->
                        descendObj obj, k, ctx, (err, k_obj) ->
                            descendObj obj, e, ctx, (err, v_obj) ->
                                dobj =
                                    key: k_obj
                                    val: v_obj
                                _cb null, dobj

        # Combine results into single object
        async.parallel tasks, (err, results) ->
            result_obj = {}
            for result in results
                result_obj[result.key] = result.val
            cb null, result_obj

    # Get attribute
    else
        cb null, accessor obj, step.get

accessor = (obj, key) ->
    if key == '.'
        return obj
    else
        if key.match /^-?\d+/
            key = Number key
            # Pythonesque negative indexes
            if key < 0
                return obj.slice(key)[0]
        return obj[key]

# create a command out of a script
through = (cmd) -> (inp, args, ctx, cb) ->
    pipeline = parsePipelines(cmd)[0]
    if pipeline[0].cmd?
        pipeline[0].cmd.push args...
    runPipeline pipeline, inp, ctx, cb

# Read in an at expression
at = (inp, expr, ctx, cb) ->
    descendObj inp, expr, ctx, cb

module.exports =
    Pipeline: Pipeline
    Context: Context
    parsePipelines: parsePipelines
    runPipeline: runPipeline
    doCmd: doCmd
    through: through
    at: at

