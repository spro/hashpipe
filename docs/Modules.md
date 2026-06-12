# Writing hashpipe modules

Modules add commands to hashpipe. A module is a TypeScript file in
`src/modules/` that exports functions; `use <name>` loads it and registers
each exported function as a command.

```coffee
#| use http
'Using: http.get, http.post, ...'

#| http.get https://api.github.com/repos/spro/hashpipe @ name
'hashpipe'
```

## The command contract

Every command — builtin or module — is a function with the same signature:

```typescript
import { HashpipeFunction } from "../helpers"

export const replace: HashpipeFunction = (inp, args, ctx, cb) => {
    cb(null, inp.replace(args[0], args[1]))
}
```

(That's the entire real `src/modules/replace.ts`.)

| Parameter | What it is |
|-----------|------------|
| `inp` | The piped input — any JSON value, or `null` at the start of a pipeline. |
| `args` | The parsed arguments. Substitution has already happened: a lone `$var` argument arrives with its type intact (objects stay objects, lambdas stay lambdas), numeric words arrive as numbers, everything else as strings. |
| `ctx` | The current scope. `ctx.get("vars", name)` / `ctx.set("vars", name, value)` read and write variables; `ctx.topScope()` reaches the root pipeline scope. |
| `cb` | Node-style callback: `cb(err)` fails the stage (aborting the pipeline unless an `\|?` stage catches it), `cb(null, result)` passes `result` to the next stage. |

A synchronous `throw` inside a command is converted into a pipeline error,
but prefer `cb(err)` — it's the contract everything else follows.

```coffee
#| use replace

#| echo hello world | replace world there
'hello there'
```

## Naming and namespacing

`use foo` loads `src/modules/foo` and registers every exported function as
`foo.<exportName>`:

```coffee
#| use http        # exports get, post, ... → http.get, http.post, ...
```

Two shortcuts:

- An export whose name **matches the module name** is also registered bare:
  `replace.ts` exports `replace`, so both `replace` and `replace.replace`
  work.
- A **default export object** works too — its keys become the command
  names: `export default { get, post }`.

Exports that aren't functions are skipped, so modules can keep internal
constants and helpers alongside their commands.

Since command lookup checks the scope chain before builtins, a module
export can intentionally shadow a builtin. `which <name>` shows where a
name resolves, and `builtin <name>` reaches the original.

## Async commands

Anything asynchronous just calls `cb` when done:

```typescript
import { HashpipeFunction } from "../helpers"

export const fetchJson: HashpipeFunction = (inp, args, ctx, cb) => {
    fetch(String(args[0]))
        .then((res) => res.json())
        .then((data) => cb(null, data))
        .catch((err) => cb(String(err)))
}
```

The REPL shows a spinner while a slow command runs; parallel pipes (`||`)
call the command once per list item concurrently, so keep commands
stateless.

## Wrapping existing functions

`src/helpers.ts` has adapters for plain functions so you don't write
boilerplate:

- `wraponeSync(f)` — wraps a synchronous `f(...args)`; with
  `wraponeSync(f, true)` the piped input is prepended to the arguments.
- `wrapone(f)` — wraps a callback-style `f(...args, cb)`.
- `wrapall(obj, prefix, with_inp, sync)` — wraps every function on an
  object at once.

```typescript
import { wraponeSync } from "../helpers"

export const slugify = wraponeSync(
    (s: string) => s.toLowerCase().replace(/\s+/g, "-"),
    true, // piped input becomes the first argument
)
```

```coffee
#| use slugify

#| echo Hello There World | slugify
'hello-there-world'
```

## Accepting lambdas

Commands can take function values (`{| ... }` literals, `$vars` holding
them, or bare names of defined commands). Use `resolveCallable` from
`src/builtins/common.ts` to accept all three forms the way `map`, `filter`,
and `reduce` do:

```typescript
import { resolveCallable } from "../builtins/common"

export const twice: HashpipeFunction = (inp, args, ctx, cb) => {
    const fn = resolveCallable(args[0], ctx)
    if (!fn) return cb("twice: expected a lambda or command name")
    fn(inp, [], (err, once) => {
        if (err) return cb(err)
        fn(once, [], cb)
    })
}
```

## Where modules live

`use <name>` resolves through a search path, first hit wins:

1. **Explicit paths** — `use ./my-module.js`, `use /abs/path/mod`, or
   `use ~/mods/thing`, resolved against the working directory
2. **`HASHPIPE_PATH`** — each colon-separated directory, in order
3. **`~/.hashpipe/modules/`** — your personal module directory
4. **Bundled modules** — hashpipe's own `lib/modules/` (http, html,
   files, ...)
5. **npm packages named `hashpipe-<name>`** — `use llm` finds an
   installed `hashpipe-llm`, resolved from the working directory so a
   local `node_modules` works. Generic package names are deliberately
   not tried.

A miss lists everything that was attempted:

```coffee
#| use nope
[ERROR] ... Module 'nope' not found. Tried: ~/.hashpipe/modules/nope,
<bundled>/modules/nope, hashpipe-nope
```

When a load shadows existing commands, `use` says so:

```coffee
#| use upper      # a module exporting its own upper
'Using: upper (shadowing: upper)'
```

In the [browser repl](https://spro.github.io/hashpipe/), node-only modules
aren't available; `http` is replaced by a fetch-backed equivalent that is
preloaded.
