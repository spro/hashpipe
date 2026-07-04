# Hashpipe command reference

Hashpipe commands consume the piped input and a list of parsed arguments. Builtins
are always available. Bundled modules are loaded with `use <module>`, which
registers namespaced commands such as `http.get` and `files.cat`.

For syntax details, see [Syntax.md](Syntax.md). For workflow examples, see
[Cookbook.md](Cookbook.md).

## Core

| Command | Usage | Notes |
|---------|-------|-------|
| `id` | `id` | Returns the input unchanged. Empty scripts default to this. |
| `val` | `val value` | Returns the first argument as a value. Literal-only commands are shorthand for `val`. |
| `echo` | `echo words...` | Joins arguments with spaces into a string. |
| `key` | `key parts...` | Joins arguments without spaces. Useful for dynamic object keys. |
| `null` | `null` | Returns `null`. |
| `or` | `value | or fallback` | Returns the input when truthy, otherwise the fallback argument. |
| `bool` | `value | bool` | Coerces input with Hashpipe truthiness. |
| `if` | `if condition then else` | Returns the selected branch. Lambda branches are lazy. |
| `case` | `case key {a: 1, b: 2}` | Looks up `key` in an object. |
| `call` | `call fn args...` | Invokes a lambda value, variable holding a lambda, or named command. |

Examples:

```hashpipe
#| if true {| echo yes } {| echo no }
'yes'

#| case beta {alpha: 1, beta: 2}
2
```

## Math And Expressions

Hashpipe has both prefix math commands and infix expressions.

| Command | Usage | Notes |
|---------|-------|-------|
| `num` | `value | num` | Coerces input to a number. |
| `+` | `1 | + 2 3` | Adds input and arguments after flattening one level. |
| `-` | `10 | - 3` | Subtracts arguments from input. |
| `*` | `4 | * 7` | Multiplies input and arguments. |
| `/` | `10 | / 2` | Divides input by arguments. |
| `.` | `echo a | . b` | Concatenates input and arguments. |

Infix operators are `+ - * / % < > <= >= == !=`:

```hashpipe
#| 2 + 3 * 4
14

#| [{age: 58}, {age: 6}] | filter {| $(@ age) > 30 }
[ { age: 58 } ]
```

## Strings

| Command | Usage | Notes |
|---------|-------|-------|
| `upper` | `"hi" | upper` | Uppercases the input string. |
| `lower` | `"HI" | lower` | Lowercases the input string. |
| `capitalize` | `"hello" | capitalize` | Uppercases the first character. |
| `string` | `value | string` | Calls `toString()` on the input. |
| `trim` | `" hi " | trim` | Trims the first argument when provided, otherwise the input. |
| `split` | `"a,b" | split ","` | Splits a string. Default separator is newline. |
| `join` | `["a", "b"] | join ","` | Joins a list. Default separator is a space. |
| `match` / `grep` | `list | match pattern` | Keeps items matching a JavaScript regular expression. |
| `reverse` | `value | reverse` | Reverses strings or arrays. |

## Lists And Objects

| Command | Usage | Notes |
|---------|-------|-------|
| `list` | `list a b c` | Returns the argument list. |
| `obj` | `obj key value ...` | Builds an object from key/value argument pairs. |
| `range` | `range 5`, `range 2 5` | Returns integer ranges. End is exclusive. |
| `length` | `list | length` | Returns `.length` of input. |
| `head` | `list | head 10` | First N items. Default is 50. |
| `tail` | `list | tail 10` | Last N items. Default is 50. |
| `slice` | `list | slice start end` | JavaScript-style slice command. Prefer `@ 1..3` inside at-expressions. |
| `chunks` | `list | chunks 25` | Splits a list into fixed-size chunks. |
| `zip` | `zip [a, b] [1, 2]` | Zips arrays by position, or splits argument halves into pairs. |
| `zipobj` | `zipobj [a, b] [1, 2]` | Zips into an object. |

## Higher-Order Commands

These commands accept lambdas, variables holding lambdas, or bare names of
defined commands.

| Command | Usage | Notes |
|---------|-------|-------|
| `map` | `list | map {| ... }` | Maps each item in parallel. |
| `each` | `list | each {| ... }` | Runs each item in series for side effects, returns the original list. |
| `filter` | `list | filter {| predicate }` | Keeps items whose predicate result is truthy. With no args, keeps truthy items. |
| `reduce` | `list | reduce { $x | ... } initial` | Accumulator is piped input; current item is first argument. |
| `sort` | `list | sort`, `list | sort key`, `list | sort -key` | Sorts plain lists or lists of objects by key. |
| `sortBy` | `list | sortBy key`, `list | sortBy {| key }` | Sorts by a key or lambda-derived key. |
| `groupBy` | `list | groupBy key`, `list | groupBy {| key }` | Groups into an object keyed by the selected value. |

Examples:

```hashpipe
#| [1, 2, 3] | map {| * 10 }
[ 10, 20, 30 ]

#| [{kind: 'a'}, {kind: 'b'}, {kind: 'a'}] | groupBy kind
{ a: [ { kind: 'a' }, { kind: 'a' } ], b: [ { kind: 'b' } ] }
```

## Collection Helpers

| Command | Usage | Notes |
|---------|-------|-------|
| `keys` | `object | keys` | Object keys. |
| `values` | `object | values` | Object values. |
| `pairs` | `object | pairs` | Object entries as `[key, value]` pairs. |
| `pick` | `object | pick a b` | Keeps selected keys. |
| `omit` | `object | omit a b` | Removes selected keys. |
| `extend` | `object | extend source...` | Assigns sources into the target object. |
| `defaults` | `object | defaults source...` | Fills missing target keys from sources. |
| `where` | `list | where {kind: 'a'}` | Keeps objects matching every key/value pair. |
| `findWhere` | `list | findWhere {kind: 'a'}` | First object matching every key/value pair. |
| `indexBy` | `list | indexBy id` | Builds an object keyed by a selected value. |
| `count` | `list | count key?` | Returns sorted `{item, count}` rows. |
| `countBy` | `list | countBy key` | Returns an object of counts by selected value. |
| `bin` | `list | bin 10 valueKey?` | Groups numeric values into histogram bins. |
| `uniq` | `list | uniq` | Removes duplicate values by identity. |
| `flatten` | `list | flatten` | Deep flattens. Pass truthy arg for shallow flatten. |
| `without` | `list | without a b` | Removes listed values. |
| `union` | `union [1, 2] [2, 3]` | Unique union of lists. |
| `intersection` | `intersection [1, 2] [2, 3]` | Values present in every list. |
| `difference` | `difference [1, 2, 3] [2]` | Values from first list not present in later lists. |
| `shuffle` | `list | shuffle` | Returns a shuffled copy. |

## JSON

| Command | Usage | Notes |
|---------|-------|-------|
| `parse` | `jsonString | parse` | Parses JSON text. |
| `stringify` | `value | stringify` | Serializes to JSON text. Lambdas stringify to their source. |

## Random And Time

| Command | Usage | Notes |
|---------|-------|-------|
| `randstr` | `randstr 12` | Random base-36 string. Default length is 5. |
| `randint` | `randint 10` | Integer from `0` up to but not including max. Default max is 100. |
| `choice` | `list | choice` | Random item from a list. |
| `sample` | `list | sample 3` | Random sample. Default size is half the list. |
| `sleep` | `value | sleep 1000` | Waits milliseconds, then returns input. |
| `now` | `now` | Current `Date`. |
| `timestamp` | `timestamp` | Current Unix timestamp in milliseconds. |
| `oid-timestamp` | `objectId | oid-timestamp` | Millisecond timestamp from a MongoDB ObjectId prefix. |
| `format-date` | `date | format-date pattern` | Formats dates with Hashpipe's custom date formatter. |

## State, Modules, And Introspection

| Command | Usage | Notes |
|---------|-------|-------|
| `set` | `set name value`, `value | set name` | Stores a variable and returns the stored value. |
| `$name = pipeline` | `$x = 2 + 3` | Assignment shorthand for `set`. |
| `setall` | `object | setall` | Stores each object key as a variable. |
| `push` | `value | push name` | Appends to a list variable. |
| `inc` | `inc counter` | Increments a counter on the current context. |
| `ginc` | `ginc group key` | Assigns stable incrementing IDs per group/key. |
| `alias` | `alias name = pipeline` | Lightweight single-pipeline shortcut. |
| `aliases` | `aliases` | Lists aliases, or loads aliases from piped object. |
| `def` | `def name {| ... }` | Registers a lambda as a named command. |
| `use` | `use http files` | Loads bundled, path, `HASHPIPE_PATH`, user, or `hashpipe-*` modules. |
| `which` | `which name` | Reports whether a command resolves to a def, alias, module, or builtin. |
| `builtin` | `builtin upper` | Calls a builtin even when a def/alias/module shadows it. |
| `help` | `help` | Interactive summary of syntax and available commands. |

## Debugging

| Command | Usage | Notes |
|---------|-------|-------|
| `tee` | `value | tee | next` | Prints the input and passes it through. |
| `log` | `value | log` | Prints the input or joined arguments, then returns input. |
| `inspect` | `value | inspect` | Prints input and arguments, then returns input. |

## Bundled Modules

Load modules with `use <name>`. The default REPL preloads `http`, `html`,
`files`, and `keywords`.

### `http`

| Command | Usage | Notes |
|---------|-------|-------|
| `http.get` | `http.get url {query}` | GET and parse JSON when possible, otherwise string. |
| `http.post` | `body | http.post url` | Sends input as request body. Objects become JSON. |
| `http.put` | `body | http.put url` | PUT request. |
| `http.patch` | `body | http.patch url` | PATCH request. |
| `http.delete` | `http.delete url` | DELETE request. |
| `http.getv` | `http.getv url` | Returns `{data, headers}`. |
| `http.headers` | `http.headers url` | Returns response headers. |
| `http.options` | `http.options url` | OPTIONS request. |

The third argument can include `headers`, `auth`, or `redirect` options:

```hashpipe
#| http.get https://api.example.test/items {limit: 10} {headers: {accept: "application/json"}}
```

### `files`

| Command | Usage | Notes |
|---------|-------|-------|
| `files.cat` | `files.cat path` | Reads a text file. |
| `files.cat_stream` | `files.cat_stream path` | Returns a readable stream. |
| `files.write` | `text | files.write path` | Writes input to a file and returns input. |
| `files.ls` | `files.ls path?` | Returns `{dirs, files}` excluding dotfiles. |
| `files.cd` | `files.cd path` | Changes process working directory. |

### `html`

| Command | Usage | Notes |
|---------|-------|-------|
| `html.html2text` | `html | html.html2text` | Extracts headings and paragraphs into text. |
| `html.jq` | `html | html.jq selector` | jQuery-style selector returning element text and attributes. |

### `keywords`

| Command | Usage | Notes |
|---------|-------|-------|
| `keywords.strip_html_cmd` | `html | keywords.strip_html_cmd` | Removes HTML tags. |
| `keywords.keywords` | `text | keywords.keywords` | Lowercases, removes stopwords, returns keyword tokens. |
| `keywords.words` | `text | keywords.words` | Returns word-like tokens. |
| `keywords.slugify` | `text | keywords.slugify` | Lowercases and hyphenates text. |

### Other bundled modules

| Module | Commands | Notes |
|--------|----------|-------|
| `replace` | `replace` / `replace.replace` | String replacement: `text | replace from to`. |
| `csv` | `csv.json2csv` | Converts a list of objects to CSV text. |
| `encodings` | `encodings.atob`, `encodings.btoa` | Base64 decode/encode. |
| `xml` | `xml.xml2js_cmd` | Parses XML through `xml2js`. |
| `histogram` | `histogram.histogram` | Renders numeric or `{item, count}` lists as text bars. |
| `stats` | `stats.linreg` | Linear regression using `simple-statistics`. |
| `exec` | `exec.cmd`, `exec.spawn`, plus common process names | Runs shell commands or interactive processes. Node-only. |
| `redis` | `connect(...)` plugin factory | Programmatic Redis command factory. |
| `mongo` | none | Placeholder module. |
