pipeline = require '../pipeline'
tape = require 'tape'
util = require 'util'

_inspect = (o) -> util.inspect o, depth: null
inspect = (o) -> console.log _inspect o

#
# INPUT DATA
#

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

ctx =
    env:
        hi: 'hello'
        cheese: 'fromage'

#
# TESTS
#

tests = {}

# Test using a sub-pipe as an object value
tests.sub_val =
    cmd: """

        id seven @ :{
            name,
            dog_years: $(@dogs:age | + 0)
        }

    """
    expected: [
        name: 'bill',
        dog_years: 64
    ,
        name: 'fred',
        dog_years: 0
    ]

# Test using a sub-pipe within a sub-pipe
tests.sub_pipe  =
    cmd: """

        echo $(@ 0.name | . $(echo chee | . se) )

    """
    expected: 'billcheese'

# Test using a sub-pipe as an object key
tests.sub_key =
    cmd: """ echo Howdy, Earth! @ {$( slugify ): .} """
    expected:
        'howdy-earth': 'Howdy, Earth!'

# Test using a sub-pipe as both a key and a value
tests.sub_key_val =
    cmd: """ echo Howdy, Earth! @ {$(echo phrase): {$( slugify ): .}} """
    expected:
        phrase:
            'howdy-earth': 'Howdy, Earth!'

# Test the series pipe
tests.spipe =
    cmd: """ list 4 5 6 |= + 5 """
    expected: [9, 10, 11]

# Test varable substitution
tests.sub_var =
    cmd: """ echo $hi """
    expected: 'hello'

tests.escd_quoted =
    cmd: """ print "\\)=$cheese" """
    expected: ')=fromage'

#
# EXECUTION
#

# Print out the parsed command tree
showParsed = (cmd) ->

    console.log '\n~~~~~'
    console.log cmd + ' ->\n'
    inspect pipeline.parsePipeline cmd
    console.log '~~~~~\n'

# Run a test
runTest = (test_name) ->

    tape test_name, (t) ->

        showParsed tests[test_name].cmd
        pipeline.execPipeline tests[test_name].cmd, test_input, ctx, (err, test_result) ->

            t.deepLooseEqual test_result, tests[test_name].expected, 'Meets expectations.'
            t.end()

            console.log '\n'
            inspect test_result

# Run all the tests
for test_name, test_data of tests
    runTest test_name

