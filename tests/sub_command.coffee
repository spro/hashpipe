pipeline = require '../pipeline'
tape = require 'tape'
util = require 'util'

_inspect = (o) -> util.inspect o, depth: null
inspect = (o) -> console.log _inspect o

cmd_sub_at = """

    id seven @ :{
        name,
        dog_years: $(@dogs:age | + 0)
    }

"""

cmd_sub_pipe = """

    echo $(@ 0.name | . $(echo chee | . se) )

"""

test_input = [
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

expected_sub_at_result = [
    name: 'bill',
    dog_years: 64
,
    name: 'fred',
    dog_years: 0
]

expected_sub_pipe_result = 'billcheese'

show_parsed = (cmd) ->

    console.log '\n~~~~~'
    console.log cmd + ' ->\n'
    inspect pipeline.parse_pipeline cmd
    console.log '~~~~~\n'

tape 'cmd_sub_at', (t) ->

    show_parsed cmd_sub_at
    pipeline.exec_pipeline cmd_sub_at, test_input, (err, test_result) ->

        t.deepLooseEqual test_result, expected_sub_at_result, 'Meets expectations.'
        t.end()

        console.log '\n'
        inspect test_result

tape 'cmd_sub_pipe', (t) ->

    show_parsed cmd_sub_pipe
    pipeline.exec_pipeline cmd_sub_pipe, test_input, (err, test_result) ->

        t.deepLooseEqual test_result, expected_sub_pipe_result, 'Meets expectations.'
        t.end()

        console.log '\n'
        inspect test_result

