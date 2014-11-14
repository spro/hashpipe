KEY_ENTER = 13

# jQuery function for keeping a textarea height fit
$.fn.stayFit = (multiline = true, afterFit = null) ->
    $el = $(this)
    $el.attr 'rows', 1
    padding = $el.outerHeight() - $el.height()
    line_height = parseInt $el.css('line-height')

    _stayFit = (adj) ->
        $el.height('auto')
        $el.height $el[0].scrollHeight - padding + (adj or 0) + 2
    _delayedStayFit = ->
        setTimeout(_stayFit, 0)
    _delayedStayFit()

    $el.on 'keydown', (e) ->
        if e.keyCode == KEY_ENTER and e.shiftKey
            _delayedStayFit()

    $el.on 'stayFit', (e) ->
        _stayFit()
        afterFit() if afterFit?

