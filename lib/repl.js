// Generated by CoffeeScript 1.8.0
(function() {
  var Pipeline, PipelineREPL, ansi, argv, builtins, defaultPipeline, doRunScript, fs, getHomeDir, history_path, loadHistory, path, piped, prettyPrint, prompt_length, prompt_text, readline, readline_vim, repl, saveHistory, script, script_filename, util, _;

  readline = require('readline');

  readline_vim = require('readline-vim');

  Pipeline = require('./pipeline').Pipeline;

  builtins = require('./builtins');

  ansi = require('ansi')(process.stdout);

  prettyPrint = require('./helpers').prettyPrint;

  fs = require('fs');

  path = require('path');

  _ = require('underscore');

  argv = require('yargs').argv;

  util = require('util');

  getHomeDir = function() {
    return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  };

  PipelineREPL = function(pipeline) {
    var base_env;
    this.pipeline = pipeline;
    if (!this.pipeline) {
      this.pipeline = defaultPipeline();
    }
    this.context = this.pipeline.subScope();
    base_env = _.omit(argv, '_');
    _.forEach(base_env, (function(_this) {
      return function(v, k) {
        return _this.context.set('vars', k, v);
      };
    })(this));
    this.last_out = null;
    return this;
  };

  defaultPipeline = function() {
    return new Pipeline().use('http').use('html').use('files').use('keywords');
  };

  PipelineREPL.prototype.writeSuccess = function(data) {
    if (this.plain) {
      return console.log(data);
    } else {
      return console.log(prettyPrint(data));
    }
  };

  PipelineREPL.prototype.writeError = function(err) {
    ansi.fg['red']();
    console.log('[ERROR] ' + err);
    return ansi.reset();
  };

  PipelineREPL.prototype.executeScript = function(script, cb) {
    var e;
    try {
      return this.pipeline.exec(script, this.last_out, this.context, (function(_this) {
        return function(err, data) {
          _this.last_out = data;
          if (err != null) {
            _this.writeError(err);
          } else {
            _this.writeSuccess(data);
          }
          if (cb != null) {
            return cb();
          }
        };
      })(this));
    } catch (_error) {
      e = _error;
      this.writeError(e);
      if (cb != null) {
        return cb();
      }
    }
  };

  PipelineREPL.prototype.startReadline = function() {
    var f, fnCompleter, fn_names, n, repl, rl, rl_addHistory, rlv, run_once;
    repl = this;
    fn_names = ((function() {
      var _ref, _results;
      _ref = repl.pipeline.fns;
      _results = [];
      for (n in _ref) {
        f = _ref[n];
        _results.push(n);
      }
      return _results;
    })()).concat((function() {
      var _results;
      _results = [];
      for (n in builtins) {
        f = builtins[n];
        _results.push(n);
      }
      return _results;
    })());
    fnCompleter = function(line) {
      var completions, to_complete;
      to_complete = line.split(' ').slice(-1)[0];
      completions = fn_names.filter((function(c) {
        return c.indexOf(to_complete) === 0;
      }));
      return [completions, to_complete];
    };
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: fnCompleter
    });
    rlv = readline_vim(rl);
    this.rl = rl;
    rl_addHistory = rl._addHistory;
    rl._addHistory = function() {
      var last, line;
      last = rl.history[0];
      line = rl_addHistory.call(rl);
      if (last !== line) {
        saveHistory(line);
      }
      return line;
    };
    loadHistory(function(err, saved_history) {
      return rl.history.push.apply(rl.history, saved_history);
    });
    this.setPromptColor(36);
    rl.prompt();
    run_once = this.run_once || !process.stdin.isTTY;
    return rl.on('line', function(script) {
      script = script.trim();
      if (!script.length) {
        script = 'id';
      }
      return repl.executeScript(script, function() {
        var script_exec;
        if (run_once) {
          if (script_exec = argv.exec || argv.e) {
            return repl.executeScript(script_exec, function() {
              return process.exit();
            });
          } else {
            return process.exit();
          }
        } else {
          return rl.prompt();
        }
      });
    });
  };

  prompt_text = "#| ";

  prompt_length = prompt_text.length;

  PipelineREPL.prototype.setPromptColor = function(color) {
    var prefix, suffix;
    if (color == null) {
      color = 0;
    }
    prefix = '\x1b[' + color + 'm';
    suffix = '\x1b[0m';
    return this.rl.setPrompt(prefix + prompt_text + suffix, prompt_length);
  };

  history_path = path.resolve(getHomeDir(), '.pipeline_history');

  saveHistory = function(line) {
    return fs.appendFile(history_path, line + '\n');
  };

  loadHistory = function(cb) {
    return fs.readFile(history_path, function(err, history_data) {
      var history_lines;
      if (!history_data) {
        return cb(null, []);
      }
      history_lines = history_data.toString().trim().split('\n');
      history_lines.reverse();
      return cb(null, history_lines);
    });
  };

  if (require.main !== module) {
    module.exports = PipelineREPL;
  } else {
    repl = new PipelineREPL;
    if (argv.plain || argv.p) {
      repl.plain = true;
    }
    if (script_filename = argv.run || argv.r) {
      doRunScript = function() {
        var script;
        script = fs.readFileSync(script_filename).toString();
        return setTimeout(function() {
          return repl.executeScript(script, function() {
            return process.exit();
          });
        }, 50);
      };
      if (!process.stdin.isTTY) {
        piped = '';
        process.stdin.on('data', function(data) {
          return piped += data.toString();
        });
        process.stdin.on('end', function() {
          repl.last_out = piped.trim();
          return doRunScript();
        });
      } else {
        doRunScript();
      }
    } else if (script_filename = argv.load || argv.l) {
      console.log("Reading from " + script_filename + "...");
      script = fs.readFileSync(script_filename).toString();
      setTimeout(function() {
        return repl.executeScript(script, function() {
          return repl.startReadline();
        });
      }, 50);
    } else {
      repl.startReadline();
    }
  }

}).call(this);