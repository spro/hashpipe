# Hashpipe syntax crash course

* [Commands](#commands)
* [Literals](#literals)
* [Arrays and objects](#arrays-and-objects)
* [Variables](#variables)
* [Pipelines](#pipelines)
* [Statements and comments](#statements-and-comments)
* [Sub-pipes](#sub-pipes)
* [Expressions](#expressions)
* [Functions](#functions)
* [Aliases and modules](#aliases-and-modules)
* [At-expressions](#at-expressions)

## Commands

As in bash, a command is followed by space-separated arguments; arguments may
be bare words (interpreted as strings), [literal values](#literals), [arrays,
objects](#arrays-and-objects), [variables](#variables) or [sub-pipes](#sub-pipes).

```hashpipe
#| echo test
'test'

#| list 1 2.5 3
[ 1, 2.5, 3 ]

#| list hello "i am dog"
[ 'hello', 'i am dog' ]
```

## Literals

Hashpipe supports a few basic types as literals: numbers, strings, booleans
and `null`. They may be used as command arguments or alone (using them alone
is actually a shortcut for the `val` command).

```hashpipe
#| 4.20
4.2

#| "Testing this"
'Testing this'

#| true
true

#| null
null

#| val 5.25
5.25

#| val woof
'woof'
```

**Note:** though strings may be bare words when used as arguments, in most
other places the quotes are required.

## Arrays and objects

There are two ways to express a list; using the `list [value]...` command or
with a JSON-esque syntax:

```hashpipe
#| list 1 2 3
[ 1, 2, 3 ]

#| [1, 2, 3]
[ 1, 2, 3 ]
```

Objects may be defined either with the `obj [key] [value]...` command or
JSON-esque syntax:

```hashpipe
#| obj first Freddy last Todd
{ first: 'Freddy', last: 'Todd' }

#| {first: "Freddy", last: "Todd"}
{ first: 'Freddy', last: 'Todd' }
```

When using the JSON-esque syntaxes, values are interpreted as commands themselves:

```hashpipe
#| [echo one, echo two, echo eleven]
[ 'one', 'two', 'eleven' ]

#| {a: list 1 2}
{ a: [ 1, 2 ] }

#| [{a: 1}, obj "b" 2, {'d': 3}, list 4 5 6]
[ { a: 1 }, { b: 2 }, { d: 3 }, [ 4, 5, 6 ] ]
```

## Variables

Variables are set with the `set` command. The `set` command takes one or two arguments - the first argument is always the variable name. If a second argument is supplied it will be used as the value to set; otherwise any piped input will be used.

```hashpipe
#| set today 'Wednesday'
'Wednesday'

#| echo Tuesday | set yesterday
'Tuesday'
```

Variables are used with the `$var` syntax in command arguments. String arguments will be replaced with the value of the named variable (unless escaped, as in `\$bar`)

```hashpipe
#| echo I just realized today is $today.
'I just realized today is Wednesday.'

#| echo Going up, on a $yesterday
'Going up, on a Tuesday'

#| list $yesterday $today \$tomorrow
[ 'Tuesday', 'Wednesday', '$tomorrow' ]
```

The special variable `$!` references the output of the last command.

```hashpipe
#| [1, 2, 3] | join ', ' | echo Easy as $!
'Easy as 1, 2, 3'

#| list a b c | length | echo There were $! letters in there.
'There were 3 letters in there.'
```

Braces mark where a variable name ends, so values can be spliced into
longer words:

```hashpipe
#| $file = 'data.json'

#| echo ${file}_v2
'data.json_v2'
```

An argument that is exactly one variable keeps its value's type — objects
stay objects instead of stringifying:

```hashpipe
#| $u = {name: "Al"}

#| list $u
[ { name: 'Al' } ]
```

## Pipelines

A command's output may be piped to another to be used as input with the `|`
operator.

```hashpipe
#| echo one two three
'one two three'

#| echo one two three | split ' '
[ 'one', 'two', 'three' ]
```

Hashpipe also has special pipe operators that act over lists; the parallel `||`
and series `|=` pipes. Both map each item of the list through a single command
and return a new list of each result.

```hashpipe
#| list 1 2 3 || + 5
[ 6, 7, 8 ]

#| list Tom Fred George || echo Sir $!
[ 'Sir Tom', 'Sir Fred', 'Sir George' ]
```

A failed stage normally aborts the whole pipeline. The error pipe `|?`
catches the failure instead: its command runs only when something upstream
failed, receiving the error as input, and is skipped entirely on success.

```hashpipe
#| no-such-command |? echo recovered: $!
'recovered: No command no-such-command. '

#| echo fine |? echo never-runs
'fine'

#| no-such-command |? val fallback | upper
'FALLBACK'
```

## Statements and comments

Statements are separated by `;` or by newlines, so script files read
naturally. A pipeline can still span lines by breaking at a pipe (leading or
trailing):

```hashpipe
$x = 2 ; $y = 3
echo hello
  | upper
'HELLO'
```

A `#` at the start of a statement begins a comment, running to the end of
the line (or to the next `;`). A `#` inside a word stays literal, so URL
fragments are unaffected:

```hashpipe
# this whole line is a comment
http.get http://example.com/page#section
```

Any metacharacter can be escaped with a backslash:

```hashpipe
#| echo a \| b
'a | b'

#| echo 100\% \#1 \$cash
'100% #1 $cash'

#| list a\ b
[ 'a b' ]
```

## Sub-pipes

Create a sub-pipe with `$( command... )`. The sub-pipe is executed and
substituted with its result in the outer command's argument list.

```hashpipe
#| list $(4 | + 4) $(5 | - 5) $(6 | + 2)
[ 8, 0, 8 ]

#| echo $( echo $( echo Turtles $( echo all the way down ) ) )
'Turtles all the way down'
```

Sub-pipes are passed the same input as the outer command.

```hashpipe
#| list 1 2 3 || echo $( * 2 ) "/ 2"
[ '2 / 2', '4 / 2', '6 / 2' ]
```

## Expressions

Infix expressions provide familiar arithmetic and comparison syntax wherever a
command can appear. Operands may be numbers, quoted strings, `$vars`
(including `$!`), sub-pipes, or parenthesized expressions. Operators may be
written with or without surrounding whitespace, and bare words are never
operands, so prefix commands like `* 7` work as before.

```hashpipe
#| 2 + 3 * 4
14

#| 12+1
13

#| (2 + 3) * 4
20

#| 10|$!-4
6

#| [1, 2, 3] || $! * 2
[ 2, 4, 6 ]
```

Arithmetic operators are `+ - * / %`; comparisons are `< > <= >= == !=` and
evaluate to booleans, which makes natural filter predicates:

```hashpipe
#| 5 > 3
true

#| [{name: 'sparky', age: 58}, {name: 'woofer', age: 6}] | filter {| $(@ age) > 30 } @ :name
[ 'sparky' ]
```

`*` and `/` bind tighter than `+` and `-`, which bind tighter than
comparisons.

## Functions

A lambda literal `{| pipeline... }` creates a *function value*: an
unevaluated pipeline that can be stored in variables, passed to commands, and
invoked later. Piping into a lambda invokes it with the piped input.

```hashpipe
#| 5 | {| * 2 }
10

#| $double = {| * 2 }

#| 5 | $double
10
```

### Higher-order commands

`map`, `each`, `reduce` and `filter` take a lambda and apply it across a
list. The lambda receives each item as its input.

```hashpipe
#| [1, 2, 3] | map {| * 2 }
[ 2, 4, 6 ]

#| [{name: 'huey', ok: true}, {name: 'dewey', ok: false}] | filter {| @ ok } @ :name
[ 'huey' ]
```

`sortBy` and `groupBy` accept a lambda as a key extractor (a plain string
argument is still treated as a key name):

```hashpipe
#| [{n: 3}, {n: 1}, {n: 2}] | sortBy {| @ n } @ :n
[ 1, 2, 3 ]
```

`reduce` passes the accumulator as the lambda's input and the current item as
its first argument:

```hashpipe
#| [1, 2, 3, 4] | reduce { $x | $! + $x } 0
10
```

### Naming the input

The input may be given a name by writing a `$`-variable between the opening
brace and the first pipe. The name binds the first command argument if one
is given, and the piped input otherwise — so both call styles work:

```hashpipe
#| def dog-years { $n | $n * 7 }

#| dog-years 6
42

#| 6 | dog-years
42
```

Multiple names bind arguments in order, with any leftover name receiving the
piped input; arguments beyond the named ones are available as the `$args`
list.

```hashpipe
#| def pair { $a $b | [$a, $b] }

#| pair 1 2
[ 1, 2 ]

#| 5 | pair 3
[ 3, 5 ]

# 4 is piped input, 7 is an argument binding to $n
#| def multiply-by { $n | * $n }

#| 4 | multiply-by 7
28
```

The `$` sigil is what distinguishes a name from a command: a plain
pipe-through lambda always starts `{|`, and a body of bare words like
`{| trim | upper }` is always a pipeline, never a name list.

### Named functions with `def`

`def` registers a lambda as a named command. Defined names work anywhere a
command does, including as bare-name references passed to higher-order
commands.

```hashpipe
#| def dog-years { $n | $n * 7 }

#| dog-years 6
42

#| def shout {| upper }

#| echo hello | shout
'HELLO'

#| list a b | map shout
[ 'A', 'B' ]
```

Defined names — along with aliases and module commands — take precedence
over builtins, so any command can be redefined. `builtin` runs the original
regardless of shadowing, and `which` reports where a name resolves:

```hashpipe
#| def upper {| echo shadowed }

#| echo hi | upper
'shadowed'

#| echo hi | builtin upper
'HI'

#| which upper
{ command: 'upper', type: 'def', src: '{| echo shadowed }', shadows: 'builtin' }
```

### `call` and closures

`call` invokes a function value explicitly, passing along arguments. Lambdas
close over the scope they were created in, so a function can build and return
another function:

```hashpipe
#| set greet { $name | echo Hello $name }

#| call $greet World
'Hello World'

#| def adder { $n | {| + $n } }

#| 3 | call $(adder 5)
8
```

### Lazy branches with `if`

`if` takes a condition and one or two branches. Lambda branches are lazy —
only the taken branch ever runs. (Plain values are also accepted, as before.)

```hashpipe
#| if true {| echo yes } {| echo no }
'yes'
```

**Note:** `alias` remains a lighter-weight cousin of `def`: the body is a
single pipeline (it stops at `;`), call-site arguments are appended to the
body's first command, and the body runs in the caller's scope. Use `def` when
you want named parameters or a multi-pipeline body.

## Aliases and modules

`alias name = pipeline` creates a shortcut; `aliases` lists what's defined:

```hashpipe
#| alias sevens = * 7

#| 6 | sevens
42

#| aliases
{ sevens: '* 7' }
```

`use` loads a module, registering its commands under the module's
namespace (`http.get`, `files.cat`, ...). The default REPL preloads `http`,
`html`, `files`, and `keywords`.

```hashpipe
#| use replace

#| echo hello world | replace world there
'hello there'
```

See [Modules.md](Modules.md) for writing your own modules.

## At-expressions

An `@`-expression is a special suffix used to traverse and transform objects and arrays. They may occur at the end of any command. 

### Getting with `.accessor`

The simplest use case for `@` is accessing the attributes of an object, or
items of an array, with the `.` or *get* operator. It is similar to the `.`
syntax for javascript objects, except that it applies to both object keys and
array indices.

```hashpipe
#| {name: "Fred", age: 42} @ .name
'Fred'

#| ['a', 'b', 'c'] @ .0
'a'
```

We can chain attributes with `.` to descend further into an object:

```hashpipe
#| [{name: "Fred"}, {name: "Paul"}, {name: "Sam"}] @ .1.name
'Paul'
```

For simplicity, the leading `.` is implied.

```hashpipe
#| {name: "Fred", age: 42} @ name
'Fred'
```

Negative indices count from the end, Python-style:

```hashpipe
#| ['a', 'b', 'c'] @ -1
'c'
```

Slices use `start..end` with the end excluded, like JavaScript's `slice`
method. Either side may be omitted, and negative bounds count from the end:

```hashpipe
#| ['a', 'b', 'c', 'd'] @ 1..3
[ 'b', 'c' ]

#| ['a', 'b', 'c', 'd'] @ ..2
[ 'a', 'b' ]

#| ['a', 'b', 'c', 'd'] @ -2..
[ 'c', 'd' ]
```

### Mapping with `:accessor`

To access one key of an array of objects, we can use the `:` or *map* operator.
The map operator applies an accessor to each item of an array, and returns a
new array with the results.

```hashpipe
#| [{name: "Fred"}, {name: "Paul"}, {name: "Sam"}] @ :name
[ 'Fred', 'Paul', 'Sam' ]
```

Map also works for array indices. The *get* and *map* operators can be chained
freely:

```hashpipe
#| [{name: "Fred"}, {name: "Paul"}, {name: "Sam"}] @ :name:0
[ 'F', 'P', 'S' ]

#| [{name: "Fred"}, {name: "Paul"}, {name: "Sam"}] @ :name:0.0
'F'
```

Doubling the colon maps one level deeper — `::key` maps over a list of
lists:

```hashpipe
#| [[{n: 1}], [{n: 2}]] @ ::n
[ [ 1 ], [ 2 ] ]
```

Slices can be mapped too:

```hashpipe
#| [[0, 1, 2], [3, 4, 5]] @ :1..
[ [ 1, 2 ], [ 4, 5 ] ]
```

### Quoted keys and wildcards

Quote a key to reach names that bare words can't express, and use `*` to
take all values of an object (chainable like any accessor):

```hashpipe
#| {"content type": "json"} @ "content type"
'json'

#| {a: 1, b: 2} @ *
[ 1, 2 ]

#| {a: {n: 1}, b: {n: 2}} @ *:n
[ 1, 2 ]
```

### Multi-get with `[expression, ...]`

With the multi-get syntax, several attributes can be plucked off a single
object to form an array.

```hashpipe
#| {name: "Fred", happy: true, kind: 'dog'} @ [name, happy]
[ 'Fred', true ]
```

Each member of a multi-get is a full expression, so accessors may be chained:

```hashpipe
#| {name: "Sam", pets: [{name: 'Woofer'}, {name: 'Barky'}]} @ [name, pets:name]
[ 'Sam', [ 'Woofer', 'Barky' ] ]
```

### Multi-get with `{key: expression, ...}`

Similar to the array-based multi-get, you can use the object-based multi-get to
return an object of named values. If an accessor expression is not specified,
the key name is used instead.

```hashpipe
#| $fred = {name: 'Fred', age: 42, happy: true}

#| $fred @ {n: name, h: happy}
{ n: 'Fred', h: true }

#| $fred @ {name, h: happy}
{ name: 'Fred', h: true }
```

Again, each member is a full expression, allowing for chaining and nesting.

```hashpipe
#| $fred @ [name, {age, happy}]
[ 'Fred', { age: 42, happy: true } ]

#| $fred @ [name, {age, mood: {happy}}]
[ 'Fred', { age: 42, mood: { happy: true } } ]
```

**Note:** the special `.` expression may be used within a multi-get to return
the full input.

```hashpipe
#| $fred @ {name, self: .}
{ name: 'Fred',          
  self: { name: 'Fred', age: 42, happy: true } } 
```

### Sub-pipes as '@'-expressions

Transformations may be applied by using sub-pipes as `@`-expressions. Most
useful in a multi-get array or object.

**Note:** the input to the sub-pipe will be the current context of the
`@`-expression. Further `@`-expressions may be used within sub-pipes to specify
accessors to act on.

```hashpipe
#| {name: "Woofer", dog_years: 6} @ {name, human_years: $(@ dog_years | * 7)}
{ name: 'Woofer', human_years: 42 }

#| {dogs: [{name: "Barky"}, {name: "Woofer"}]} @ dogs:name:{name: ., yelling: $(upper)}
[ { name: 'Barky', yelling: 'BARKY' },
  { name: 'Woofer', yelling: 'WOOFER' } ]

#| list {name: "Barky", dog_years: 5} {name: "Woofer", dog_years: 6} @ :{name, human_years: $(@ dog_years | * 7)}
[ { name: 'Barky', human_years: 35 },
  { name: 'Woofer', human_years: 42 } ]
```
