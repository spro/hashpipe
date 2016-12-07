{exec, spawn} = require 'child_process'

known_exec = 'cp'.split(' ')
known_spawn = 'vim tmux th coffee node pm2 npm git make'.split(' ')

known_exec.map (k) ->
    exports[k] = (inp, args, ctx, cb) ->
        exec [k].concat(args).join(' '), (err, stdout, stderr) ->
            cb null, stdout

known_spawn.map (k) ->
    exports[k] = (inp, args, ctx, cb) ->
        process.stdin.setRawMode(false)
        ctx._readline.pause()
        child = spawn k, args,
            stdio: 'inherit'

        child.on 'exit', (e, code) ->
            process.stdin.setRawMode(true)
            ctx._readline.prompt()
            cb null, 'Exited: ' + k

exports.exec = (inp, args, ctx, cb) ->
    exec args[0], (err, stdout, stderr) ->
        cb null, stdout
