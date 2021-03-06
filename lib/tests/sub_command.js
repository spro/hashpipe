// Generated by CoffeeScript 1.11.1
(function() {
  var Pipeline, _inspect, i, inspect, parsePipelines, pipe, ref, results, runTest, showParsed, tape, test_ctx, test_data, test_input, test_name, tests, util;

  ref = require('../pipeline'), Pipeline = ref.Pipeline, parsePipelines = ref.parsePipelines;

  tape = require('tape');

  util = require('util');

  _inspect = function(o) {
    return util.inspect(o, {
      depth: null
    });
  };

  inspect = function(o) {
    return console.log(_inspect(o));
  };

  test_input = [
    {
      name: 'bill',
      dogs: [
        {
          name: 'sparky',
          age: 58
        }, {
          name: 'woofer',
          age: 6
        }
      ]
    }, {
      name: 'fred',
      dogs: []
    }
  ];

  pipe = new Pipeline().use('keywords');

  test_ctx = pipe.subScope({
    vars: {
      hi: 'hello',
      world: 'earth',
      cheese: 'fromage',
      george: {
        name: 'Gregory'
      }
    }
  });

  tests = {};

  tests.first = {
    cmd: " obj name joe | echo $( @ name ) ",
    expected: 'joe'
  };

  tests.sub_pipe = {
    cmd: "\necho $(@ 0.name | . $(echo chee | . se) )\n",
    expected: 'billcheese'
  };

  tests.sub_val = {
    cmd: "\nid seven @ :{\n    name,\n    dog_years: $(@dogs:age | + 0)\n}\n",
    expected: [
      {
        name: 'bill',
        dog_years: 64
      }, {
        name: 'fred',
        dog_years: 0
      }
    ]
  };

  tests.sub_key = {
    cmd: " echo \"Howdy, Earth!\" @ {$( slugify ): .} ",
    expected: {
      'howdy-earth': 'Howdy, Earth!'
    }
  };

  tests.sub_key_val = {
    cmd: " echo \"Howdy, Earth!\" @ {$(echo phrase): {$( slugify ): .}} ",
    expected: {
      phrase: {
        'howdy-earth': 'Howdy, Earth!'
      }
    }
  };

  tests.spipe = {
    cmd: " list 4 5 6 |= + 5 ",
    expected: [9, 10, 11]
  };

  tests.sub_var = {
    cmd: " echo $hi ",
    expected: 'hello'
  };

  tests.multi_sub_var = {
    cmd: " echo \"$hi $world\" ",
    expected: 'hello earth'
  };

  tests.escd_quoted = {
    cmd: " echo \"\\)=$cheese\" ",
    expected: ')=fromage'
  };

  tests.vars = {
    cmd: " $frank = 5 ; echo $frank ",
    expected: '5'
  };

  tests.obj_cmd = {
    cmd: " {test: 'ok'} ",
    expected: {
      test: 'ok'
    }
  };

  tests.obj_vars = {
    cmd: " $fred = {name: \"Fred\"} ; echo $( $fred @ name ) ",
    expected: 'Fred'
  };

  tests.parse_bool = {
    cmd: " true ",
    expected: true
  };

  tests.dont_parse_bool = {
    cmd: " trueth ",
    expected: void 0
  };

  tests.list_cmd = {
    cmd: " [1, 2, [3, 4]] @ 2.1 ",
    expected: 4
  };

  tests.list_objs = {
    cmd: " [{name: \"Jeorge\", age: 55}, {name: \"Fredrick\", pets: ['Kangaroo', 'Dog']}] @ 1.pets.1 | reverse ",
    expected: 'goD'
  };

  tests.set_alias = {
    cmd: " alias sayhi = echo \"hello there\" ",
    expected: {
      success: true,
      alias: 'sayhi',
      script: 'echo "hello there"'
    }
  };

  tests.use_alias = {
    cmd: " sayhi ",
    expected: 'hello there'
  };

  tests.test_ppipe = {
    cmd: " range 25 || obj id $! || id @ id ",
    expected: (function() {
      results = [];
      for (i = 0; i <= 24; i++){ results.push(i); }
      return results;
    }).apply(this)
  };

  showParsed = function(cmd) {
    console.log('\n~~~~~');
    console.log(cmd + ' ->\n');
    inspect(parsePipelines(cmd));
    return console.log('~~~~~\n');
  };

  runTest = function(test_name) {
    return tape(test_name, function(t) {
      showParsed(tests[test_name].cmd);
      return pipe.exec(tests[test_name].cmd, test_input, test_ctx, function(err, test_result) {
        t.deepLooseEqual(test_result, tests[test_name].expected, 'Meets expectations.');
        t.end();
        console.log('\n');
        return inspect(test_result);
      });
    });
  };

  for (test_name in tests) {
    test_data = tests[test_name];
    runTest(test_name);
  }

}).call(this);
