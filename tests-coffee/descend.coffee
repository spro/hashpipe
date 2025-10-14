pipeline = require '../pipeline'
tape = require 'tape'
util = require 'util'

_inspect = (o) -> util.inspect o, depth: null
inspect = (o) -> console.log _inspect o

test_input =
    name: 'jones'
    favorites:
        animal: 'walrus'
        color: 'chartreuse'
    things: [[{name: 'james', type: 'friend'}, {name: 'joe', type: 'friend'}], [{name: 'apple', type: 'food'}]]

expr = [ { get: 'things' }, { map: 'type', depth: 2 } ]

expected_result = [['friend', 'friend'], ['food']]

tape 'descend_test', (t) ->

    pipeline.at test_input, expr, {}, (err, test_result) ->

        t.deepLooseEqual test_result, expected_result, 'Meets expectations.'
        t.end()
