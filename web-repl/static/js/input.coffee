
localStorage.history = JSON.stringify [] if !localStorage.history?
localStorage.history_at = -1

# Enter runs command, up and down traverse history, tab completes
handle_key_down = (e) ->

    if e.which == 13 # Enter
        e.preventDefault()
        e.stopPropagation()
        # Get and send command
        raw_cmd = $('#command textarea').val().trim()
        $('#command textarea').val('')
        send_server(raw_cmd)

    if e.which == 38 # Down
        if localStorage.history.length > 2 # "[]"
            e.preventDefault()
            history = JSON.parse localStorage.history
            history_at = JSON.parse localStorage.history_at
            if history.length > (history_at + 1)
                history_at += 1
            localStorage.history_at = history_at
            new_val = history[history.length - 1 - history_at]
            $('#command textarea').val(new_val)
            setCaretPosition($('#command textarea'), new_val.length) if new_val
            $('#command textarea').trigger 'stayFit'

    if e.which == 40 # Up
        if localStorage.history.length > 2
            history = JSON.parse localStorage.history
            history_at = JSON.parse localStorage.history_at
            new_val = ''
            if (history_at) < -1
                history_at = -1
            else
                new_val = history[history.length - history_at]
            localStorage.history_at = history_at - 1
            $('#command textarea').val(new_val)
            setCaretPosition($('#command textarea'), new_val.length) if new_val
            $('#command textarea').trigger 'stayFit'

    if e.which == 9 # Tab
        e.preventDefault()
        current_whole = $('#command textarea').val()
        current_parts = current_whole.split(' ')
        current_end = current_parts.pop()
        for k, v of window
            if k.indexOf("handle_#{ current_end }") == 0
                completion_end = k[7..]
        if completion_end?
            $('#command textarea').val current_parts.concat(completion_end).join(' ')
        if not completion_end?
            for h in JSON.parse localStorage.history
                if h.indexOf(current_whole) == 0
                    completion_whole = h
            if completion_whole?
                $('#command textarea').val completion_whole


