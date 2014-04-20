fs = require 'fs'
_ = require 'underscore'

module.exports = builtins = {}

# Command helpers
valid = (i) ->
    if _.isArray i
        return (i.length > 0)
    if _.isObject i
        return (_.keys(i).length > 0)
    return i
combine = (inp, args) -> _.flatten([inp].concat(args)).filter valid

# Arithmetic

num = (n) -> Number(n) || 0

reducer = (f) ->
    (inp, args, ctx, cb) ->
        cb null, combine(inp, args).reduce(f)

builtins['+'] = reducer (a, b) -> num(a) + num(b)
builtins['*'] = reducer (a, b) -> num(a) * num(b)
builtins['-'] = reducer (a, b) -> num(a) - num(b)
builtins['/'] = reducer (a, b) -> num(a) / num(b)
builtins['.'] = reducer (a, b) -> a + b

# Basics

builtins.id = (inp, args, ctx, cb) -> cb null, inp
builtins.echo = (inp, args, ctx, cb) -> cb null, args.join(' ')
builtins.key = (inp, args, ctx, cb) -> cb null, args.join('')
builtins.list = (inp, args, ctx, cb) -> cb null, args
builtins.range = (inp, args, ctx, cb) ->
    if args.length == 2
        i0 = num(args[0])
        i1 = num(args[1]) - 1
    else
        i0 = 0
        i1 = num(args[0]) - 1
    cb null, [i0 .. i1]

builtins.num = (inp, args, ctx, cb) -> cb null, num inp
builtins.print = (inp, args, ctx, cb) ->
    subd = args.join(' ')
    if matched = subd.match /#{.+?}/g
        for match in matched
            key = match.slice(2,-1).trim()
            if key == '.'
                val = inp
            else
                val = inp[key]
            subd = subd.replace match, val
    cb null, subd
builtins.length = (inp, args, ctx, cb) -> cb null, inp.length
builtins.reverse = (inp, args, ctx, cb) -> cb null, inp.reverse()
builtins.head = (inp, args, ctx, cb) -> cb null, inp[..args[0]||50]
builtins.tail = (inp, args, ctx, cb) -> cb null, inp[inp.length-(args[0]||50)..]
builtins.join = (inp, args, ctx, cb) -> cb null, inp.join args[0] || ' '
builtins.split = (inp, args, ctx, cb) -> cb null, inp.split args[0] || '\n'
builtins.unique = (inp, args, ctx, cb) -> cb null, _.uniq inp

builtins.sleep = (inp, args, ctx, cb) -> setTimeout cb, Number args[0]

# Environmental parasites

# `inc` increments a number given a key
builtins.inc = (inp, args, ctx, cb) ->
    inc_key = args[0]
    ctx[inc_key] = 0 if !ctx[inc_key]?
    cb null, ++ctx[inc_key]

# `ginc` gets or increments a number given a key and object key
builtins.ginc = (inp, args, ctx, cb) ->
    inc_key = args[0]
    obj_key = args[1]
    if !ctx[inc_key]?
        ctx[inc_key] =
            val: 0
            objs: {}
    if ctx[inc_key].objs[obj_key]?
        cb null, ctx[inc_key].objs[obj_key]
    else
        obj_val = ++ctx[inc_key].val
        ctx[inc_key].objs[obj_key] = obj_val
        cb null, obj_val

# Matching, filtering

builtins.match = (inp, args, ctx, cb) ->
    if args.length == 2
        inp = args[0]
        match_with = args[1]
    else
        match_with = args[0]
    matched = []
    for i in inp
        if i.match match_with
            matched.push i
    cb null, matched
builtins.grep = builtins.match

builtins.filter = (inp, args, ctx, cb) ->
    filtered_inp = []
    if args.length > 0
        filter_code = 'return (' + args.join(' ') + ');'
        filter_func = new Function 'i', filter_code
        filtered_inp = inp.filter filter_func
    else
        # Filter out null items
        for i in inp
            filtered_inp.push(i) if i
    cb null, filtered_inp

# HTTP Requests

request = require 'request'

builtins.get = (inp, args, ctx, cb) ->
    request.get {url: args[0], json: true}, (err, res, data) ->
        cb null, data

jsdom = require 'jsdom'
jquery = require 'jquery'

builtins.html2text = (inp, args, ctx, cb) ->
    jsdom.env inp, (err, window) ->
        $ = jquery(window)
        text = $('h1, h2, h3, p')
            .map(-> $(this).text())
            .get().join(' ... ')
        cb null, text

builtins.jq = (inp, args, ctx, cb) ->
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

# File operations

builtins.tee = (inp, args, ctx, cb) ->
    console.log inp
    cb null, inp

builtins.cat = (inp, args, ctx, cb) ->
    fs.readFile args[0], (err, buffer) ->
        cb err, buffer.toString()

builtins.write = (inp, args, ctx, cb) ->
    fs.writeFile args[0], inp, (err) ->
        cb null, 'Wrote to ' + args[0]

builtins.parse = (inp, args, ctx, cb) ->
    cb null, JSON.parse inp

builtins.stringify = (inp, args, ctx, cb) ->
    cb null, JSON.stringify inp

# TODO: Break these out of builtins (and figure out how to
# modularly include functions at the same time)

builtins.youtube_links = (inp, args, ctx, cb) ->
    jsdom.env inp, (err, window) ->
        $ = jquery(window)
        links = []

        $('a').each ->

            if $(this).attr('href')?.match /^\/watch/
                links.push
                    title: $(this).attr('title')
                    href: $(this).attr('href')

        cb null, links

builtins.youtube_views = (inp, args, ctx, cb) ->
    jsdom.env inp, (err, window) ->
        $ = jquery(window)
        text = $('.watch-view-count').text()
        cb null, Number text.replace(/\D/g, '')

# Keywords and counting

stopwords = RegExp '\\b' + "a about above after again against all am an and any are aren't as at be because been before being below between both but by can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further get got had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's like me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's will with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves".split(' ').reverse().join('\\b|\\b') + '\\b', 'g'

strip_html = (s) -> s.replace(/<(?:.|\n)*?>/gm, '')
builtins.strip_html = (inp, args, ctx, cb) ->
    cb null, strip_html(inp)

builtins.keywords = (inp, args, ctx, cb) ->
    cb null, strip_html(inp.toLowerCase())
        .replace(stopwords, '')
        .replace(/\s+/, ' ')
        .match(/[a-z']{2,}/g)

builtins.words = (inp, args, ctx, cb) ->
    cb null, inp.match /[\w']{2,}/g

builtins.slugify = (inp, args, ctx, cb) ->
    cb null, inp.toLowerCase().replace(/\W+/g, '-').replace(/^\W?(.+)\W$/, '$1')

builtins.count = (inp, args, ctx, cb) ->
    counts = {}
    for i in inp
        counts[i] = 0 if not counts[i]?
        counts[i] += 1
    counts_list = []
    for k, v of counts
        counts_list.push
            item: k
            count: v
    counts_list.sort (a, b) -> a.count - b.count
    cb null, counts_list

builtins.sort = (inp, args, ctx, cb) ->
    if sort_by = args[0]
        if sort_by[0] == '-'
            sort_by = sort_by[1..]
            cb null, inp.sort (a, b) -> b[sort_by] - a[sort_by]
        else
            cb null, inp.sort (a, b) -> a[sort_by] - b[sort_by]
    else
        cb null, inp.sort()

# Test data

dog_people = [
    name: 'bill',
    dogs: [
        name: 'sparky'
        age: 58
    ,
        name: 'woofer'
        age: 6
    ],
,
    name: 'fred',
    dogs: []
]

builtins.dog_people = (inp, args, ctx, cb) -> cb null, dog_people

