{exec, spawn} = require 'child_process'

# known_exec = 'cp pwd'.split(' ')
known_spawn = 'ls cp mv ln ps grep awk sed find kill mkdir touch vim tmux th coffee node python pm2 npm git make ssh scp sudo'.split(' ')

# known_exec.map (k) ->
#     exports[k] = (inp, args, ctx, cb) ->
#         exec [k].concat(args).join(' '), (err, stdout, stderr) ->
#             cb null, stdout

known_spawn.map (k) ->
    exports[k] = (inp, args, ctx, cb) ->
        process.stdin.setRawMode(false)
        ctx._readline.pause()
        child = spawn k, args,
            stdio: 'inherit'
            cwd: process.cwd()
            env: process.env

        child.on 'exit', (e, code) ->
            process.stdin.setRawMode(true)
            ctx._readline.prompt()
            cb null

exports.exec = (inp, args, ctx, cb) ->
    exec args.join(' '), (err, stdout, stderr) ->
        cb null, stdout

exports.spawn = (inp, args, ctx, cb) ->
    process.stdin.setRawMode(false)
    ctx._readline.pause()

    if args.length == 1
        args = args[0].split ' '

    child = spawn args[0], args.slice(1),
        stdio: 'inherit'
        cwd: process.cwd()
        env: process.env

    child.on 'error', (err) ->
        process.stdin.setRawMode(true)
        ctx._readline.prompt()
        cb err

    child.on 'exit', (e, code) ->
        process.stdin.setRawMode(true)
        ctx._readline.prompt()
        cb null
