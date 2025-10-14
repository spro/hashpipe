{Pipeline, parsePipelines} = require '../pipeline'
tape = require 'tape'
util = require 'util'

_inspect = (o) -> util.inspect o, depth: null
inspect = (o) -> console.log _inspect o

pipe = new Pipeline()
    .use 'keywords' # for slugify

test_ctx = pipe.subScope
    vars:
        hi: 'hello'
        cheese: 'fromage'
        george:
            name: 'Gregory'

tests = {}

tests.single_obj =
    cmd: """{name: "joe"}"""
    expected: {name: 'joe'}

tests.nested_obj =
    cmd: """{name: {lang: 'en', value: "Joe"}}"""
    expected: {name: {lang: 'en', value: 'Joe'}}

tests.obj_at =
    cmd: """{name: "fred"} @ name"""
    expected: 'fred'

# ======================
# EXECUTION
# ======================

# Print out the parsed command tree
showParsed = (cmd) ->

    console.log '\n~~~~~'
    console.log cmd + ' ->\n'
    inspect parsePipelines cmd
    console.log '~~~~~\n'

# Run a test
runTest = (test_name) ->

    tape test_name, (t) ->

        showParsed tests[test_name].cmd
        pipe.exec tests[test_name].cmd, {}, test_ctx, (err, test_result) ->

            t.deepLooseEqual test_result, tests[test_name].expected, 'Meets expectations.'
            t.end()

            console.log '\n'
            inspect test_result

# Run all the tests
for test_name, test_data of tests
    runTest test_name

