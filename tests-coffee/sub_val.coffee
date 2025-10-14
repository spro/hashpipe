{Pipeline, parsePipelines} = require '../pipeline'
tape = require 'tape'
util = require 'util'

_inspect = (o) -> util.inspect o, depth: null
inspect = (o) -> console.log _inspect o

# Test input data
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

pipe = new Pipeline()
test_ctx = pipe.subScope()

tape 'sub_val', (t) ->

    cmd = """

        id seven @ :{
            name,
            dog_years: $(@dogs:age | + 0)
        }

    """

    console.log '\n~~~~~'
    console.log cmd + ' ->\n'
    inspect parsePipelines cmd
    console.log '~~~~~\n'

    pipe.exec cmd, test_input, test_ctx, (err, test_result) ->

        if err
            console.log 'ERROR:', err

        console.log '\nResult:'
        inspect test_result

        expected = [
            name: 'bill',
            dog_years: 64
        ,
            name: 'fred',
            dog_years: 0
        ]

        console.log '\nExpected:'
        inspect expected

        t.deepLooseEqual test_result, expected, 'Meets expectations.'
        t.end()
