# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Goal

**Converting all CoffeeScript to TypeScript**

This is an active migration project. The codebase is currently written in CoffeeScript and needs to be converted to TypeScript while maintaining functionality and improving type safety.

## Project Overview

Hashpipe is an experimental JSON-based shell designed for manipulating web APIs instead of filesystems. Currently being migrated from CoffeeScript to TypeScript.

## Directory Structure

- `src/` - TypeScript source files (migration target)
- `lib/` - Compiled TypeScript output (JavaScript)
- `lib-coffee/` - Compiled CoffeeScript output (legacy)
- `*.coffee` - CoffeeScript source files (original, being migrated)
- `tests/` - Test files (CoffeeScript)
- `modules/` - Plugin modules (CoffeeScript)
- `grammar.peg` - PEG.js the grammar definition

## Build and Development Commands

### TypeScript Build (New)
```bash
npm run build
```
Compiles TypeScript from `src/` to JavaScript in `lib/` and copies the PEG grammar.

Build steps:
1. Compiles TypeScript: `tsc`
2. Compiles PEG grammar: `pegjs grammar.peg`
3. Copies `grammar.js` to `lib/`

### CoffeeScript Build (Legacy)
```bash
npm run build-coffee
```
Compiles `.coffee` files to `.js` in the `lib-coffee/` directory and compiles the PEG grammar.

### Testing
```bash
# TypeScript tests (once migration is complete)
npm test

# CoffeeScript tests (legacy)
npm run test-coffee
```

### Cleaning
```bash
npm run clean
# Removes both lib/ and lib-coffee/ directories
```

### Running the REPL
```bash
# After building
hashpipe

# Or directly with coffee
coffee repl.coffee
```

### Running Scripts
```bash
# Execute a script file
hashpipe --run script.hp
# or
hashpipe -r script.hp

# Execute a script and then open REPL
hashpipe --load script.hp
# or
hashpipe -l script.hp

# Execute inline command
hashpipe --exec "echo hello"
# or
hashpipe -e "echo hello"

# Plain output (no pretty printing)
hashpipe --plain
# or
hashpipe -p
```

## Core Architecture

### Pipeline System (pipeline.coffee)

The core execution model is based on pipelines that process JSON data through a series of commands.

**Key Classes:**
- `Scope`: Base class for managing variables, functions, and context with parent-child relationships
- `Context`: Extends Scope for execution contexts
- `Pipeline`: Main class that extends Scope and handles:
  - `.use()` - Load modules (either by name from `./modules/` or as objects)
  - `.exec(script, input, context, callback)` - Parse and execute pipeline scripts
  - `.execFile(filename, input, context, callback)` - Execute script from file

**Execution Flow:**
1. `parsePipelines()` - Uses PEG grammar to parse command strings into token arrays
2. `runPipelines()` - Executes multiple pipelines in series
3. `runPipeline()` - Executes a single pipeline, processing tokens left to right
4. `doCmd()` - Looks up and executes individual commands from builtins or context

### Piping Constructs

- `|` - Standard pipe (sequential, like bash)
- `||` - Parallel pipe (maps command over array in parallel)
- `|=` - Series pipe (maps command over array sequentially)
- `@` - At expressions for traversing JSON (e.g., `@ name`, `@ :name`, `@ 0`)

### Grammar (grammar.peg)

PEG.js-based parser defining the hashpipe syntax:
- Pipeline syntax (pipes, parallel pipes, series pipes)
- At expressions for JSON traversal (`.` for get, `:` for map)
- Sub-commands using `$()` syntax
- Variable references with `$` prefix
- Object and array literals
- Aliasing and variable setting

### Built-in Commands (builtins.coffee)

~100 built-in commands organized by category:
- Arithmetic: `+`, `*`, `-`, `/`, `.` (concatenation)
- Basics: `id`, `val`, `echo`, `num`, `bool`, `if`, `case`
- Collections: `list`, `obj`, `range`
- String: `upper`, `lower`, `capitalize`, `trim`
- List ops: `length`, `reverse`, `head`, `tail`, `join`, `split`, `slice`
- Filtering: `match`/`grep`, `filter`
- Transforms: `sort`, `count`, `bin`, `chunks`, `zip`, `zipobj`
- Underscore.js wrappers: `keys`, `values`, `pairs`, `pick`, `omit`, `extend`, `where`, `sortBy`, `groupBy`, `uniq`, `flatten`, etc.
- Environment: `set`, `setall`, `inc`, `push`
- Modules: `use`, `alias`, `aliases`
- Debug: `tee`, `log`, `inspect`
- Utilities: `parse`, `stringify`, `now`, `timestamp`, `randstr`, `randint`, `choice`, `sample`

All builtins follow the signature: `(inp, args, ctx, cb)`

### REPL (repl.coffee)

Interactive shell with:
- Readline with vim mode support (`readline-vim`)
- Command history persisted to `~/.pipeline_history`
- Tab completion for commands and files
- Pretty-printed JSON output with ANSI colors
- `@last_out` - stores result of last command as input to next
- Default modules loaded: `http`, `html`, `files`, `keywords`

### Modules (modules/)

Loadable extensions providing additional commands:
- `http` - HTTP methods: `get`, `post`, `put`, `delete`, `get-headers`, `get-all`
- `html` - HTML parsing with jsdom and jQuery
- `files` - File system operations
- `keywords` - Keyword extraction
- `exec` - Execute shell commands
- `csv`, `xml` - Data format parsers
- `mongo`, `redis` - Database clients
- `soundcloud`, `youtube` - API integrations
- `encodings`, `histogram`, `stats` - Utilities

Modules export objects with functions following the `(inp, args, ctx, cb)` signature.

### At Expressions and Object Traversal

The `@` syntax provides powerful JSON traversal:
- `descendObj()` - Recursively navigates object trees based on at expressions
- Supports mapping over arrays with `:` syntax
- Allows sub-commands for computed keys/values
- Pythonic negative array indexing

## Key Implementation Details

- **Async Flow**: Uses `async.js` for parallel/series operations
- **Variable Substitution**: `$varname` in commands, `$!` for input
- **Sub-commands**: `$(pipeline)` syntax executes nested pipelines
- **Scope Chain**: Child scopes inherit from parent scopes for variables and functions
- **Aliasing**: Create command shortcuts with `alias name = pipeline`
- **Helper Functions**: `helpers.coffee` provides wrappers to convert sync/async functions to the hashpipe callback signature

# More notes

- Use the coffeescript versions of all test commands until they are in a passing state
- Use SCRATCH.md for notes when working on a complex problem
- Feel free to empty SCRATCH.md whenever a new problem is started
