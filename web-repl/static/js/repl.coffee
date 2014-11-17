randomString = (len=8) ->
    s = ''
    while s.length < len
        s += Math.random().toString(36).slice(2, len-s.length+2)
    return s

localStorage.history = JSON.stringify [] if !localStorage.history?
localStorage.history_at = -1

getHistory = ->
    history = JSON.parse localStorage.history
    history_at = JSON.parse localStorage.history_at
    [history, history_at]

addToHistory = (input) ->
    [history, history_at] = getHistory()
    history.push(input)
    localStorage.history = JSON.stringify history
    localStorage.history_at = -1

# Dispatcher
# ------------------------------------------------------------------------------

Dispatcher =
    inputs: new Bacon.Bus
    outputs: new Bacon.Bus
    events: new Bacon.Bus

    addInput: (id, input) ->
        Dispatcher.inputs.push
            id: id
            input: input
        addToHistory input
        setTimeout ->
            execInput input, (err, output) ->
                Dispatcher.outputs.push
                    id: id
                    output: output
        , 0
        return id

last_output = {}

execInput = (input, cb) ->
    execScript context, last_output, input, (err, output) ->
        last_output = output
        cb err, output

# Views
# ------------------------------------------------------------------------------

Input = React.createClass
    getInitialState: ->
        input: @props.input || ''
        enabled: true

    onKeyDown: (e) ->
        if e.keyCode == 13 and !e.shiftKey # Enter
            e.preventDefault()
            e.stopPropagation()
            @props.addInput @state.input.trim()

        if e.keyCode == 38 # Down
            if localStorage.history.length > 2 # "[]"
                e.preventDefault()
                [history, history_at] = getHistory()
                if history.length > (history_at + 1)
                    history_at += 1
                localStorage.history_at = history_at
                new_val = history[history.length - 1 - history_at]
                @setInput new_val

        if e.keyCode == 40 # Up
            if localStorage.history.length > 2
                [history, history_at] = getHistory()
                new_val = ''
                if (history_at) < -1
                    history_at = -1
                else
                    new_val = history[history.length - history_at]
                localStorage.history_at = history_at - 1
                @setInput new_val

        if e.keyCode == 9 # Tab
            e.preventDefault()
            current_whole = @state.input
            current_parts = current_whole.split(' ')
            current_end = current_parts.pop()
            for k, v of methods
                if k.indexOf(current_end) == 0
                    completion_end = k
            if completion_end?
                @setInput current_parts.concat(completion_end).join(' ')
            if not completion_end?
                [history, history_at] = getHistory()
                for h in history
                    if h.indexOf(current_whole) == 0
                        completion_whole = h
                if completion_whole?
                    @setInput new_val

    setInput: (input) ->
        @setState input: input, @triggerStayFit

    componentDidMount: ->
        $(@refs.input.getDOMNode()).stayFit()

    triggerStayFit: ->
        $(@refs.input.getDOMNode()).trigger 'stayFit'

    onChange: (e) ->
        @setState input: e.target.value

    render: ->
        if @state.enabled
            input = `<textarea className="input" ref="input" value={this.state.input} onKeyDown={this.onKeyDown} onChange={this.onChange} />`
        else
            input = `<span className="input">{this.props.input}</span>`
        `(
            <div className="read">
                <div className="prompt">#|</div>
                {input}
            </div>
        )`

Output = React.createClass
    componentDidMount: ->
        $output = $(@refs.output.getDOMNode())
        output = @props.output
        if React.isValidElement output
            React.render output, @refs.output.getDOMNode()
        if _.isElement(output) or (_.isArray(output) and  _.every(output, _.isElement))
            $output.append output
        else if _.isObject(output) or _.isNumber(output) or _.isArray(output)
            $output.JSONView output
            $output.JSONView 'collapse', 3
        else if _.isUndefined(output)
            $output.html $('<span class="null">undefined</span>')
        else if _.isNull(output)
            $output.html $('<span class="null">null</span>')
        else
            $output.html output

    render: ->
        `(
            <div className="print">
                <div className="output" ref="output"></div>
            </div>
        )`

Loading = React.createClass

    render: ->
        `<div className="loading">Loading...</div>`

Line = React.createClass

    addInput: (input) ->
        console.log 'my id is ' , @props.line.id
        console.log 'the input is', input
        Dispatcher.addInput @props.line.id, input

    render: ->
        line = @props.line

        input = `<Input input={line.input} addInput={this.addInput} />`

        if line.loading
            output = `<Loading  />`
        else if line.output?
            output = `<Output output={line.output}  />`

        `<div className="line">{input}{output}</div>`

newLine = -> {id: randomString(), input: ''}

Repl = React.createClass
    getInitialState: ->
        first_line = newLine()
        first_indexes = {}; first_indexes[first_line.id] = 0
        return {
            lines: [first_line]
            line_indexes: first_indexes
        }

    componentWillMount: ->
        Dispatcher.inputs.onValue @onInput
        Dispatcher.outputs.onValue @onOutput

    componentDidMount: -> @focusLastInput()
    componentDidUpdate: ->
        console.log '[Repl.componentDidUpdate]'
        @focusLastInput()
        @scrollToBottom()

    focusLastInput: ->
        $(@getDOMNode()).find('textarea').last().focus()

    # TODO: Immutability wreaks havoc on readability
    onInput: (input) ->

        # Add a new blank line
        new_line = newLine()
        new_i = @state.lines.length
        _lines = React.addons.update(@state.lines, {$push: [new_line]})

        # Update the last line with a loading state
        _l_update = {$merge: {loading: true}}
        _ls_update = {}; _ls_update[@state.line_indexes[input.id]] = _l_update
        _lines = React.addons.update(_lines, _ls_update)

        # Save the new line's index
        _i_update = {}; _i_update[new_line.id] = new_i
        _line_indexes = React.addons.update(@state.line_indexes, {$merge: _i_update})

        @setState
            lines: _lines
            line_indexes: _line_indexes

    onOutput: (output) ->
        # Save the output on the proper line by finding its line index
        i = @state.line_indexes[output.id]
        _l_update = {$merge: {loading: false, output: output.output}}
        _ls_update = {}; _ls_update[i] = _l_update
        @setState lines: React.addons.update(@state.lines, _ls_update)

    scrollToBottom: ->
        $('body').animate scrollTop: $(@getDOMNode()).height()

    render: ->
        lines = @state.lines.map (line) -> `<Line line={line} key={line.id} />`
        `(
            <div>
                {lines}
            </div>
        )`

React.render `<Repl />`, $('#repl')[0]

Imggrid = React.createClass
    getInitialState: ->
        showing: null

    setShowing: (i) ->
        if i == @state.showing
            @setState showing: null
        else
            @setState showing: i

    render: ->
        imgs = @props.imgs.map (i) =>
            expand = (e) => e.preventDefault(); e.stopPropagation(); @setShowing(i)
            c = if (@state.showing == i) then 'showing' else ''
            @makeImg i, c, expand

        `<div className="imggrid">{imgs}</div>`

    makeImg: (i, c, expand) ->
        `<div className="cell"><div className={'img ' + c} style={{backgroundImage: 'url('+i+')'}} onClick={expand} key={i} /></div>`

methods.imggrid = (ctx, inp, args..., cb) ->
    cb null, `<Imggrid imgs={inp} />`

