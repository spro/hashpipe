jsdom = require 'jsdom'
jquery = require 'jquery'

# "html" -> html2text -> "text"
exports.html2text = (inp, args, ctx, cb) ->
    jsdom.env inp, (err, window) ->
        $ = jquery(window)
        text = $('h1, h2, h3, p')
            .map(-> $(this).text())
            .get().join(' ... ')
        cb null, text

# "html" -> jq "selectors" -> [json elements]
exports.jq = (inp, args, ctx, cb) ->
    jsdom.env inp, (err, window) ->
        $ = jquery(window)
        els = []

        $(args.join(' ')).each ->
            $el = $(this)
            el_json =
                text: $el.text()
            for attr in this.attributes
                el_json[attr.name] = attr.value
            els.push el_json

        cb null, els

