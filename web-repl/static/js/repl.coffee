localStorage.history = JSON.stringify [] if !localStorage.history?
localStorage.history_at = -1

addInput = ->
    $line = $($('#_input_line').html())
    $('.lines').append $line
    $input = $line.find('.input')
    $input.stayFit()
    $input.focus()

    $input.on 'keydown', (e) ->

        if e.keyCode == 13 and !e.shiftKey # Enter
            e.preventDefault()
            e.stopPropagation()
            readInput($line)

        if e.keyCode == 38 # Down
            if localStorage.history.length > 2 # "[]"
                e.preventDefault()
                history = JSON.parse localStorage.history
                history_at = JSON.parse localStorage.history_at
                if history.length > (history_at + 1)
                    history_at += 1
                localStorage.history_at = history_at
                new_val = history[history.length - 1 - history_at]
                $input.val(new_val)
                $input.trigger 'stayFit'

        if e.keyCode == 40 # Up
            if localStorage.history.length > 2
                history = JSON.parse localStorage.history
                history_at = JSON.parse localStorage.history_at
                new_val = ''
                if (history_at) < -1
                    history_at = -1
                else
                    new_val = history[history.length - history_at]
                localStorage.history_at = history_at - 1
                $input.val(new_val)
                $input.trigger 'stayFit'

        if e.keyCode == 9 # Tab
            e.preventDefault()
            current_whole = $input.val()
            current_parts = current_whole.split(' ')
            current_end = current_parts.pop()
            for k, v of methods
                if k.indexOf(current_end) == 0
                    completion_end = k
            if completion_end?
                $input.val current_parts.concat(completion_end).join(' ')
            if not completion_end?
                for h in JSON.parse localStorage.history
                    if h.indexOf(current_whole) == 0
                        completion_whole = h
                if completion_whole?
                    $input.val completion_whole

addToHistory = (input) ->
    history = JSON.parse localStorage.history
    history.push(input)
    localStorage.history = JSON.stringify history
    localStorage.history_at = -1

readInput = ($line) ->
    input = $line.find('.input').val().trim()
    addToHistory input
    execInput input, (err, output) ->
        addOutput($line, output)
    addInput()

last_output = {}

execInput = (input, cb) ->
    execScript context, last_output, input, cb

addOutput = ($after, output) ->
    $line = $($('#_output_line').html())
    last_output = output
    console.log 'output:', output
    if _.isObject output
        $line.find('.output').JSONView output
        $line.find('.output').JSONView 'collapse', 3
    else
        $line.find('.output').html output
    $after.after $line

addInput()

$('body').on 'click', ->
    $('.lines .line .input').last().focus()

