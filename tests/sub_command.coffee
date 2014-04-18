pipeline = require '../pipeline'
tape = require 'tape'
util = require 'util'

_inspect = (o) -> util.inspect o, depth: null
inspect = (o) -> console.log _inspect o

cmd = """

    id @ :{
        name,
        dog_years: $(@dogs:age | + 0)
    }

"""

test_input = [
    name:'joe',
    dogs: [
        name: 'sparky'
        age: 58
    ,
        name: 'woofer'
        age: 6
    ],
,
    name:'fred',
    dogs: []
]

expected_result = [
    name: 'joe',
    dog_years: 64
,
    name: 'fred',
    dog_years: 0
]

console.log '\n~~~~~'
console.log _inspect(cmd) + ' ->\n'
inspect pipeline.parse_pipeline cmd
console.log '~~~~~\n'

tape 'sub_command_test', (t) ->

    pipeline.exec_pipeline cmd, test_input, (err, test_result) ->

        t.deepLooseEqual test_result, expected_result, 'Meets expectations.'
        t.end()

