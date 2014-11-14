span = (c, text) -> "<span class='#{ c }'>#{ text }</span>"

class JSONFormatter
    constructor: (options) ->
        @options = options

    htmlEncode: (html) ->
        if html != null
            html.toString()
                .replace(/&/g,"&amp;")
                .replace(/"/g,"&quot;")
                .replace(/</g,"&lt;")
                .replace(/>/g,"&gt;")
        else
            ''

    # Completely escape a json string
    jsString: (s) ->
        s = JSON.stringify(s).slice(1, -1)
        @htmlEncode(s)

    decorateWithSpan: (value, className) ->
        """
        <span class="#{className}">#{@htmlEncode(value)}</span>
        """

    # Convert a basic JSON datatype (number, string, boolean, null, object, array) into an HTML fragment.
    valueToHTML: (value, level = 0) ->
        valueType = Object.prototype.toString.call(value).match(/\s(.+)]/)[1].toLowerCase()
        @["#{valueType}ToHTML"].call(this, value, level)

    nullToHTML: (value) ->
        @decorateWithSpan('null', 'null')

    numberToHTML: (value) ->
        @decorateWithSpan(value, 'num')

    stringToHTML: (value) ->
        if (/^(http|https|file):\/\/[^\s]+$/i.test(value))
            """
            <a href="#{@htmlEncode(value)}"><span class="q">"</span>#{@jsString(value)}<span class="q">"</span></a>
            """
        else
            multiline = ''
            if @options.nl2br
                newLinePattern = /([^>\\r\\n]?)(\\r\\n|\\n\\r|\\r|\\n)/g
                value = @jsString(value)
                multiline = 'multiline' if newLinePattern.test(value)
                if multiline != ''
                    value = (value + '').replace(newLinePattern, '$1' + '<br />')
            """
            <span class="string #{multiline}">"#{value}"</span>
            """

    booleanToHTML: (value) ->
        @decorateWithSpan(value, 'bool')

    # Convert an array into an HTML fragment
    arrayToHTML: (array, level = 0) ->
        hasContents = false
        output = ''
        numProps = array.length
        for value, index in array
            hasContents = true
            output += '<li>' + @valueToHTML(value, level + 1)
            output += ',' if  numProps > 1
            output += '</li>'
            numProps--

        if ( hasContents )
            collapsible = if level == 0 then '' else ' collapsible'
            inner = """
                <ul class='level#{level}#{collapsible}'>#{output}</ul>
            """
        else
            inner = ' '
        
        _o = span 'marker', '['
        _c = span 'marker', ']'
        span 'array', _o + inner + _c

    # Convert a JSON object to an HTML fragment
    objectToHTML: (object, level = 0) ->
        hasContents = false
        output = ''
        numProps = 0
        for prop of object
            numProps++

        for prop, value of object
            hasContents = true
            output += """
            <li><span class="prop"><span class="q">"</span>#{@jsString(prop)}<span class="q">"</span></span>: #{@valueToHTML(value, level + 1)}
            """
            output += ',' if numProps > 1
            output += '</li>'
            numProps--
        if hasContents
            collapsible = if level == 0 then '' else ' collapsible'
            inner = """
                <ul class="obj level#{level}#{collapsible}">#{output}</ul>
            """
        else
            inner = ' '
        
        _o = span 'marker', '{'
        _c = span 'marker', '}'
        span 'object', _o + inner + _c

    #Convert a whole JSON object into a formatted HTML document.
    jsonToHTML: (json) ->
        """
        <div class="jsonview">#{@valueToHTML(json)}</div>
        """

Collapser =
    bindEvent: (item, collapsed) ->
        collapser = document.createElement('div')
        collapser.className = 'collapser'
        collapser.innerHTML = if collapsed then '+' else '-'
        collapser.addEventListener('click', (event) =>
            @toggle(event.target)
        )
        item.insertBefore(collapser, item.firstChild)
        @collapse(collapser) if collapsed

    expand: (collapser) ->
        target = @collapseTarget(collapser)
        ellipsis = target.parentNode.getElementsByClassName('ellipsis')[0]
        target.parentNode.removeChild(ellipsis)
        target.style.display = ''
        collapser.innerHTML = '-'

    collapse: (collapser) ->
        target = @collapseTarget(collapser)
        target.style.display = 'none'
        ellipsis = document.createElement('span')
        ellipsis.className = 'ellipsis'
        ellipsis.innerHTML = ' ... '
        target.parentNode.insertBefore(ellipsis, target)
        collapser.innerHTML = '+'

    toggle: (collapser) ->
        target = @collapseTarget(collapser)
        if target.style.display == 'none'
            @expand(collapser)
        else
            @collapse(collapser)

    collapseTarget: (collapser) ->
        targets = collapser.parentNode.getElementsByClassName('collapsible')
        return unless targets.length
        target = targets[0]

do (jQuery) ->

    # @include lib/json_formatter.coffee
    # @include lib/collapser.coffee

    $ = jQuery

    JSONView =
        collapse: (el) ->
            Collapser.collapse(el) if el.innerHTML == '-'

        expand: (el) ->
            Collapser.expand(el) if el.innerHTML == '+'

        toggle: (el) ->
            Collapser.toggle(el)

    $.fn.JSONView = ->
        args = arguments

        if JSONView[args[0]]?
            # it's method call
            method = args[0]

            @each ->
                $this = $(this)
                if args[1]?
                    # collapse/expand by node level
                    level = args[1]
                    $this.find(".jsonview .collapsible.level#{level}").parent().siblings('.collapser').each -> JSONView[method](this)

                else
                    # no level specify? collapse/expand all!
                    $this.find('.jsonview > ul > li > .collapsible').siblings('.collapser').each -> JSONView[method](this)

        else
            json = args[0]
            options = args[1] || {}

            defaultOptions =
                collapsed: false,
                nl2br: false

            options = $.extend(defaultOptions, options)

            formatter = new JSONFormatter(nl2br: options.nl2br)
            # Covert, and catch exceptions on failure
            json = JSON.parse(json) if Object.prototype.toString.call(json) == '[object String]'
            outputDoc = formatter.jsonToHTML(json)

            @each ->
                $this = $(this)

                $this.html(outputDoc)

                items = $this[0].getElementsByClassName('collapsible')

                for item in items
                    Collapser.bindEvent(item.parentNode.parentNode, options.collapsed) if item.parentNode.parentNode.nodeName == 'LI'

