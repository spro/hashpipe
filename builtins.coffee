_ = require 'underscore'

module.exports = builtins = {}

# Command helpers
combine = (inp, args) -> _.flatten([inp].concat(args)).filter (i) -> i

# Arithmetic

nums = (l) -> l.map (n) -> Number(n) || 0
calc = (f) ->
    (inp, args, ctx, cb) ->
        cb null, nums(combine(inp, args)).reduce(f)

builtins['+'] = calc (a, b) -> a + b
builtins['*'] = calc (a, b) -> a * b
builtins['-'] = calc (a, b) -> a - b
builtins['/'] = calc (a, b) -> a / b

# Basics

builtins.id = (inp, args, ctx, cb) -> cb null, inp
builtins.echo = (inp, args, ctx, cb) -> cb null, args.join(' ')
builtins.list = (inp, args, ctx, cb) -> cb null, args

builtins.length = (inp, args, ctx, cb) -> cb null, inp.length
builtins.reverse = (inp, args, ctx, cb) -> cb null, inp.reverse()
builtins.head = (inp, args, ctx, cb) -> cb null, inp[..args[0]||50]
builtins.tail = (inp, args, ctx, cb) -> cb null, inp[inp.length-args[0]||50..]
builtins.join = (inp, args, ctx, cb) -> cb null, inp.join args[0] || ' '
builtins.split = (inp, args, ctx, cb) -> cb null, inp.split args[0] || '\n'

builtins.sleep = (inp, args, ctx, cb) -> setTimeout cb, Number args[0]

# Matching, filtering

builtins.match = (inp, args, ctx, cb) ->
    to_match = args[0]
    matched = []
    for i in inp
        if i.match to_match
            matched.push i.replace "(#{ to_match })", "<span class='object'>$1</span>"
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

