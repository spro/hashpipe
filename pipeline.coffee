parser = require './parser'
builtins = require './builtins'
async = require 'async'
util = require 'util'
_ = require 'underscore'

DEBUG = false

# Grab some tools before you dig in
recv_ = (t, s) -> console.log "[#{ t.toUpperCase() }] #{ s }"
_inspect = (o) -> util.inspect o, depth: null
inspect = (o) -> console.log _inspect o

# Execute a pipeline given a command string, input object,
# context and callback. An empty context object is created
# if none is given.

exec_pipeline = (cmd, inp, ctx, cb) ->
    if !cb?
        cb = ctx
        ctx = {}
    ctx.fns = {} if !ctx.fns?
    ctx.env = {} if !ctx.env?
    run_pipeline parse_pipeline(cmd), inp, ctx, cb

# Parse a command pipeline into a series of tokens
# that can be passed to `run_pipeline`

parse_pipeline = (cmd) ->
    parser.parse cmd

# Execute a parsed command pipeline, executing each part
# recursively by setting a callback that is either the next
# command in line or a final "stdout" callback

run_pipeline = (_cmd_tokens, inp, ctx, final_cb) ->
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
    parse_args = (inp, cb) ->
        if DEBUG
            console.log 'parsing args for ' + _inspect inp
            inspect cmd_args

        replace_arg = (arg, _cb) ->
            if _.isObject arg
                run_pipeline arg.sub, inp, ctx, _cb
            else if $vars = arg.match /\$[\w]+/
                for $v in $vars
                    vk = $v.slice 1
                    if v = ctx.env[vk]
                        arg = arg.replace $v, v
                _cb null, arg
            else
                _cb null, arg

        subs = {}
        subd_i = 0
        subd_cmd_args = []
        async.map cmd_args, replace_arg, (err, new_args) ->
            cmd = subd_cmd_args.join(' ')
            ctx.subs = subs
            cb new_args

    # Apply an at expression at the end
    at_apply = (data, cb) ->
        if cmd_token.at?
            at data, cmd_token.at, ctx, cb
        else
            cb null, data

    # Check if we're at the final step
    if cmd_tokens.length == 0
        cb = (err, ret) ->
            if DEBUG
                console.log ' ===> ' + _inspect ret
            at_apply ret, final_cb

    # Create a callback to continue the pipeline otherwise
    else cb = (err, ret) ->
        at_apply ret, (err, ret) ->
            run_pipeline cmd_tokens, ret, ctx, final_cb

    # Parse arguments and then execute

    # Map if parallel piped
    if cmd_type == 'ppipe'
        tasks = inp.map (_inp) ->
            (_cb) ->
                parse_args _inp, (args) ->
                    do_cmd args, _inp, ctx, _cb
        async.parallel tasks, cb

    # Just execute if single piped
    else
        parse_args inp, (args) ->
            do_cmd args, inp, ctx, cb

# Execute a given command by looking in `ctx.fns` for a function
# called `[cmd]` and passing that function the split arguments

do_cmd = (_args, inp, ctx, cb) ->
    if DEBUG
        console.log '\n##### DO CMD ######'
        inspect _args
        inspect inp
        console.log '###################\n'
    args = _.clone _args
    cmd = args.shift()
    if fn = ctx.fns[cmd] || builtins[cmd]
        fn(inp, args, ctx, cb)
    else
        cb "No command #{ cmd }. "

# Splits a string into "arguments" by separating with whitespace
# while attempting to treat quoted strings as single arguments.
# TODO: Make a more robust parser that can handle escaping, etc.

split_args = (s) ->
    args = []
    s.trim().replace /"([^"]*)"|'([^']*)'|(\S+)/g, (g0,g1,g2,g3) ->
        args.push(g1 || g2 || g3 || '')
    return args

# Map a function into array of arrays at a certain depth
map_into = (l, f, d, cb) ->
    if d == 1
        async.map l, f, cb
    else
        _into = (_l, _cb) -> map_into _l, f, d - 1, _cb
        async.map l, _into, cb

# Take an object and an expression and follow the expression
# tree down to the desired result
descend_obj = (_obj, _expr, ctx, final_cb) ->
    obj = _.clone _obj
    expr = _.clone _expr

    step = expr.shift()

    # Check if we're at the final step
    if expr.length == 0
        cb = final_cb

    else cb = (err, ret) ->
        descend_obj ret, expr, ctx, final_cb

    if !step?
        cb null, obj

    # Map attributes
    if step.map?
        map_get = (__obj, _cb) ->
            descend_obj __obj, [{get: step.map}], ctx, _cb
        map_into obj, map_get, step.depth, cb

    # Substitution
    else if step.sub?
        run_pipeline step.sub, obj, ctx, cb

    # Array result
    else if _.isArray step.get
        tasks = step.get.map (step_expr) ->
            (_cb) -> descend_obj obj, step_expr, ctx, _cb
        async.parallel tasks, cb

    # Object result
    else if _.isObject step.get
        tasks = {}
        for k, e of step.get
            do (k, e) ->
                tasks[k] = (_cb) ->
                    descend_obj obj, e, ctx, _cb
        async.parallel tasks, cb

    # Get attribute
    else
        if step.get == '.'
            obj = obj
        else
            obj = obj[step.get]
        cb null, obj

# Read in an at expression
at = (inp, expr, ctx, cb) ->
    descend_obj inp, expr, ctx, cb

module.exports =
    exec_pipeline: exec_pipeline
    parse_pipeline: parse_pipeline
    run_pipeline: run_pipeline
    do_cmd: do_cmd
    at: at

