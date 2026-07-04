# Hashpipe cookbook

These recipes show common data workflows with current Hashpipe syntax. They use
literal data where possible so the examples are stable and easy to paste into
the REPL.

For language syntax, see [Syntax.md](Syntax.md). For command details, see
[Commands.md](Commands.md).

## Reshape JSON

Use `@` object expressions to pick and rename fields.

```hashpipe
#| {id: 7, title: "Hello", by: "sam", score: 42} @ {title, author: by, score}
{ title: 'Hello', author: 'sam', score: 42 }
```

Map a shape over a list with `:{...}`:

```hashpipe
#| [{id: 1, title: "A", by: "ada"}, {id: 2, title: "B", by: "bea"}] @ :{id, title, author: by}
[ { id: 1, title: 'A', author: 'ada' },
  { id: 2, title: 'B', author: 'bea' } ]
```

Use slices to take a page of results:

```hashpipe
#| range 10 @ 2..5
[ 2, 3, 4 ]

#| [[0, 1, 2], [3, 4, 5]] @ :1..
[ [ 1, 2 ], [ 4, 5 ] ]
```

## Filter And Sort Objects

For simple exact matches, `where` is concise:

```hashpipe
#| [{kind: 'book', price: 12}, {kind: 'game', price: 60}] | where {kind: 'book'}
[ { kind: 'book', price: 12 } ]
```

For computed predicates, use a lambda with `filter`:

```hashpipe
#| [{name: 'alpha', score: 9}, {name: 'beta', score: 17}] | filter {| $(@ score) > 10 } @ :name
[ 'beta' ]
```

Sort by a field name or by a computed key:

```hashpipe
#| [{name: 'c', score: 3}, {name: 'a', score: 1}] | sortBy name @ :name
[ 'a', 'c' ]

#| [{name: 'aa'}, {name: 'b'}] | sortBy {| @ name | length } @ :name
[ 'b', 'aa' ]
```

## Count, Group, And Index

Count repeated values:

```hashpipe
#| list api api docs cli docs docs | count
[ { item: 'cli', count: 1 },
  { item: 'api', count: 2 },
  { item: 'docs', count: 3 } ]
```

Count or group objects by a field:

```hashpipe
#| [{kind: 'a'}, {kind: 'b'}, {kind: 'a'}] | countBy kind
{ a: 2, b: 1 }

#| [{kind: 'a', id: 1}, {kind: 'b', id: 2}, {kind: 'a', id: 3}] | groupBy kind
{ a: [ { kind: 'a', id: 1 }, { kind: 'a', id: 3 } ],
  b: [ { kind: 'b', id: 2 } ] }
```

Build a lookup table:

```hashpipe
#| [{id: 'u1', name: 'Ada'}, {id: 'u2', name: 'Bea'}] | indexBy id @ u2.name
'Bea'
```

## Fetch And Shape API Data

Load `http` explicitly in scripts. The REPL preloads it by default.

```hashpipe
#| use http
#| http.get https://api.github.com/repos/spro/hashpipe @ {name, language, stars: stargazers_count}
```

Pass query parameters as the second argument:

```hashpipe
#| http.get https://api.example.test/search {q: "hashpipe", limit: 10}
```

Fetch many URLs in parallel with `||`, then reshape the results:

```hashpipe
#| $ids = [1, 2, 3]
#| $ids || http.get https://api.example.test/items/$! @ {id, title}
```

Use `|=` instead of `||` when the endpoint should be called one item at a
time.

## Handle Failures

Use `|?` to recover from a failed upstream stage:

```hashpipe
#| no-such-command |? val fallback | upper
'FALLBACK'
```

Because the error arrives as input, you can keep it:

```hashpipe
#| no-such-command |? echo failed: $!
'failed: No command no-such-command. '
```

For optional fields, combine `@` with `or`:

```hashpipe
#| {name: "Ada"} @ title | or "untitled"
'untitled'
```

## Write Reusable Pipelines

Use `def` for named commands with parameters:

```hashpipe
#| def dollars { $n | echo \$$n }
#| dollars 12
'$12'
```

Named commands work in higher-order commands:

```hashpipe
#| def adult {| $(@ age) >= 18 }
#| [{name: 'A', age: 17}, {name: 'B', age: 21}] | filter adult @ :name
[ 'B' ]
```

Use `call` when a pipeline returns a function value:

```hashpipe
#| def add { $n | {| + $n } }
#| 10 | call $(add 5)
15
```

## Read And Write Files

Load `files` explicitly in scripts. The REPL preloads it by default.

```hashpipe
#| use files
#| files.cat names.txt | split '\n' | match Jane | sort
```

Write transformed output:

```hashpipe
#| "one\ntwo\nthree" | upper | files.write out.txt
```

List files and directories:

```hashpipe
#| files.ls . @ files
```

## Convert JSON To CSV

The `csv` module turns a list of objects into CSV text.

```hashpipe
#| use csv files
#| [{name: "Ada", score: 12}, {name: "Bea", score: 9}] | csv.json2csv
'name,score\n"Ada",12\n"Bea",9'
```

Pipe the result to `files.write` to save it:

```hashpipe
#| [{name: "Ada", score: 12}] | csv.json2csv | files.write scores.csv
```

## Extract Text From HTML

The `html` module can select elements or extract readable text.

```hashpipe
#| use html
#| "<h1>Hello</h1><p>World</p>" | html.html2text
'Hello ... World'

#| "<a href='/docs'>Docs</a>" | html.jq a @ 0.{text, href}
{ text: 'Docs', href: '/docs' }
```

## Debug A Pipeline

`tee` and `inspect` print without changing the value flowing through the
pipeline.

```hashpipe
#| [{n: 1}, {n: 2}] | tee | map {| @ n | * 10 }
[ 10, 20 ]
```

Use `which` to explain command resolution:

```hashpipe
#| which upper
{ command: 'upper', type: 'builtin' }
```
