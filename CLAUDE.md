# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hashpipe is an experimental JSON-based shell designed for manipulating web APIs instead of filesystems. The codebase is TypeScript (the CoffeeScript → TypeScript migration completed in 2026; no `.coffee` files remain).

There is a live browser REPL at https://spro.github.io/hashpipe/ running the same interpreter, deployed from the `gh-pages` branch.

## Directory Structure

- `src/` — TypeScript source
  - `src/pipeline.ts` — core: Scope/Context/Pipeline, runPipeline, doCmd, at-expressions, the pipe-operator registry
  - `src/helpers.ts` — Callback/HashpipeFunction types, the Lambda class, wrapone/wraponeSync/wrapall adapters
  - `src/builtins/` — builtin commands by category (core, math, strings, collections, json, debug, random, time, environment, meta, help)
  - `src/modules/` — user-loadable modules (`use <name>`): http, html, files, exec, csv, xml, ...
  - `src/web/` — browser bundle entry + util/fs shims for esbuild
  - `src/grammar.js` — generated parser (do not edit; regenerate from grammar.peg)
- `lib/` — compiled output (committed; do not edit directly)
- `web/` — browser REPL page (index.html, repl.js, repl.css, bundled hashpipe.js)
- `grammar.peg` — the PEG.js grammar definition (source of truth for syntax)
- `tests/` — Vitest suites (`*.test.ts`)
- `docs/` — Syntax.md (language reference), Modules.md (module-author guide), extensibility-plan.html, walkthroughs/

## Commands

```bash
npm run build       # pegjs grammar → src/grammar.js + lib/grammar.js, then tsc → lib/
npm test            # vitest run (all suites must pass)
npm run build-web   # esbuild browser bundle → web/hashpipe.js
npm run repl        # run the REPL (node lib/repl.js)
npm run format      # prettier on src/ and tests/
```

Vitest does not type-check; run `npm run build` to catch TypeScript errors.

REPL flags: `-r file.hp` run a script, `-l file.hp` load then prompt, `-e "cmd"` exec, `-p` plain output. To smoke-test non-interactively, pipe a line in: `echo 'script' | node lib/repl.js` (the `-e` flag only fires after a stdin line).

## Language Summary

See docs/Syntax.md for the full reference. Beyond the original pipes (`|`, `||`, `|=`) and at-expressions (`@ name`, `@ :name`, multi-gets):

- **Statements** split on `;` or newline; `#` at statement position is a comment (mid-word `#` stays literal); any metacharacter escapes with `\`
- **Lambdas**: `{| pipeline }` is a function value; `{ $n | body }` names the input (binds the first argument if given, else the piped input; extras in `$args`)
- **`def name {| ... }`** registers named commands; `alias` is the lighter single-pipeline cousin
- **Infix expressions**: `+ - * / %` and `< > <= >= == !=` with precedence and parens, operands are values only (never bare words)
- **Error pipe `|?`**: runs only when an upstream stage failed (error arrives as input); errors otherwise abort the pipeline
- **Lookup order**: scope chain (defs/aliases/modules) shadows builtins; `builtin x` bypasses, `which x` introspects
- **Pipe operators** are a registry (`registerPipeOperator` in pipeline.ts); the grammar parses `|` + suffix generically

All commands follow the signature `(inp, args, ctx, cb)` — see docs/Modules.md.

## Conventions

- Test-first for language changes: add failing tests in `tests/`, then change grammar.peg / runtime until green. Pipeline-level tests (via `execPipeline` from tests/helpers.ts) are preferred.
- The help command's examples are executed by tests/help.test.ts — keep them runnable.
- Web deploys: copy `web/*` onto the `gh-pages` branch via a worktree, and bump the `?v=N` asset query strings in web/index.html (GitHub Pages caches assets for ~10 minutes).
- Use SCRATCH.md for notes when working on a complex problem; feel free to empty it when a new problem starts.
