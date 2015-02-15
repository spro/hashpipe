# Hashpipe syntax crash course

* [Commands](#commands)
* [Literals](#literals)
* [Arrays and objects](#arrays-and-objects)
* [Variables](#variables)
* [Pipelines](#pipelines)
* [Sub-pipes](#sub-pipes)
* [At-expressions](#at-expressions)

## Commands

As in bash, a command is followed by space-separated arguments; arguments may
be bare words (interpreted as strings), [literal values](#literals), [arrays,
objects](#arrays-and-objects), [variables](#variables) or [sub-pipes](#sub-pipes).

```coffee
# echo test
'test'

# list 1 2.5 3
[ 1, 2.5, 3 ]

# list hello "i am dog"
[ 'hello', 'i am dog' ]
```

## Literals

Hashpipe supports a few basic types as literals: numbers, strings and booleans.
They may be used as command arguments or alone (using them alone is actually a
shortcut for the `val` command).

```coffee
# 4.20
4.2

# "Testing this"
'Testing this'

# true
true

# val 5.25
5.25

# val woof
'woof'
```

**Note:** though strings may be bare words when used as arguments, in most
other places the quotes are required.

## Arrays and objects

There are two ways to express a list; using the `list [value]...` command or
with a JSON-esque syntax:

```coffee
# list 1 2 3
[ 1, 2, 3 ]

# [1, 2, 3]
[ 1, 2, 3 ]
```

Objects may be defined either with the `obj [key] [value]...` command or
JSON-esque syntax:

```coffee
# obj first Freddy last Todd
{ first: 'Freddy', last: 'Todd' }

# {first: "Freddy", last: "Todd"}
{ first: 'Freddy', last: 'Todd' }
```

When using the JSON-esque syntaxes, values are interpreted as commands themselves:

```coffee
# [echo one, echo two, echo eleven]
[ 'one', 'two', 'eleven' ]

# {a: list 1 2}
{ a: [ 1, 2 ] }

# [{a: 1}, obj "b" 2, {'d': 3}, list 4 5 6]
[ { a: 1 }, { b: 2 }, { d: 3 }, [ 4, 5, 6 ] ]
```

## Variables

Variables are set with the `set` command. The `set` command takes one or two arguments - the first argument is always the variable name. If a second argument is supplied it will be used as the value to set; otherwise any piped input will be used.

```coffee
# set today 'Wednesday'
'Wednesday'

# echo Tuesday | set yesterday
'Tuesday'
```

Variables are used with the `$var` syntax in command arguments. String arguments will be replaced with the value of the named variable (unless escaped, as in `\$bar`)

```coffee
# echo I just realized today is $today.
'I just realized today is Wednesday.'

# echo Going up, on a $yesterday
'Going up, on a Tuesday'

# list $yesterday $today \$tomorrow
[ 'Tuesday', 'Wednesday', '$tomorrow' ]
```

The special variable `$!` references the output of the last command.

```coffee
# [1, 2, 3] | join ', ' | echo Easy as $!
'Easy as 1, 2, 3'

# list a b c | length | echo There were $! letters in there.
'There were 3 letters in there.'
```

## Pipelines

A command's output may be piped to another to be used as input with the `|`
operator.

```coffee
# echo one two three
'one two three'

# echo one two three | split ' '
[ 'one', 'two', 'three' ]
```

Hashpipe also has special pipe operators that act over lists; the parallel `||`
and series `|=` pipes. Both map each item of the list through a single command
and return a new list of each result.

```coffee
# list 1 2 3 || + 5
[ 6, 7, 8 ]

# list Tom Fred George || echo Sir $!
[ 'Sir Tom', 'Sir Fred', 'Sir George' ]
```

## Sub-pipes

Create a sub-pipe with `$( command... )`. The sub-pipe is executed and
substituted with its result in the outer command's argument list.

```coffee
# list $(4 | + 4) $(5 | - 5) $(6 | + 2)
[ 8, 0, 8 ]

# echo $( echo $( echo Turtles $( echo all the way down ) ) )
'Turtles all the way down'
```

Sub-pipes are passed the same input as the outer command.

```coffee
# list 1 2 3 || echo $( * 2 ) "/ 2"
[ '2 / 2', '4 / 2', '6 / 2' ]
```

## At-expressions

An `@`-expression is a special suffix used to traverse and transform objects and arrays. They may occur at the end of any command. 

### Getting with `.accessor`

The simplest use case for `@` is accessing the attributes of an object, or
items of an array, with the `.` or *get* operator. It is similar to the `.`
syntax for javascript objects, except that it applies to both object keys and
array indices.

```coffee
# {name: "Fred", age: 42} @ .name
'Fred'

# ['a', 'b', 'c'] @ .0
'a'
```

We can chain attributes with `.` to descend further into an object:

```coffee
# [{name: "Fred"}, {name: "Paul"}, {name: "Sam"}] @ .1.name
'Paul'
```

For simplicity, the leading `.` is implied.

```coffee
# {name: "Fred", age: 42} @ name
'Fred'
```

### Mapping with `:accessor`

To access one key of an array of objects, we can use the `:` or *map* operator.
The map operator applies an accessor to each item of an array, and returns a
new array with the results.

```coffee
# [{name: "Fred"}, {name: "Paul"}, {name: "Sam"}] @ :name
[ 'Fred', 'Paul', 'Sam' ]
```

Map also works for array indices. The *get* and *map* operators can be chained
freely:

```coffee
# [{name: "Fred"}, {name: "Paul"}, {name: "Sam"}] @ :name:0
[ 'F', 'P', 'S' ]

# [{name: "Fred"}, {name: "Paul"}, {name: "Sam"}] @ :name:0.0
'F'
```

### Multi-get with `[expression, ...]`

With the multi-get syntax, several attributes can be plucked off a single
object to form an array.

```coffee
# {name: "Fred", happy: true, kind: 'dog'} @ [name, happy]
[ 'Fred', true ]
```

Each member of a multi-get is a full expression, so accessors may be chained:

```coffee
# {name: "Sam", pets: [{name: 'Woofer'}, {name: 'Barky'}]} @ [name, pets:name]
[ 'Sam', [ 'Woofer', 'Barky' ] ]
```

### Multi-get with `{key: expression, ...}`

Similar to the array-based multi-get, you can use the object-based multi-get to
return an object of named values. If an accessor expression is not specified,
the key name is used instead.

```coffee
# $fred = {name: 'Fred', age: 42, happy: true}

# $fred @ {n: name, h: happy}
{ n: 'Fred', h: true }

# $fred @ {name, h: happy}
{ name: 'Fred', h: true }
```

Again, each member is a full expression, allowing for chaining and nesting.

```coffee
# $fred @ [name, {age, happy}]
[ 'Fred', { age: 42, happy: true } ]

# $fred @ [name, {age, mood: {happy}}]
[ 'Fred', { age: 42, mood: { happy: true } } ]
```

**Note:** the special `.` expression may be used within a multi-get to return
the full input.

```coffee
# $fred @ {name, self: .}
{ name: 'Fred',          
  self: { name: 'Fred', age: 42, happy: true } } 
```

### Sub-pipes as '@'-expressions

Transformations may be applied by using sub-pipes as `@`-expressions. Most
useful in a multi-get array or object.

**Note:** the input to the sub-pipe will be the current context of the
`@`-expression. Further `@`-expressions may be used within sub-pipes to specify
accessors to act on.

```coffee
# {name: "Woofer", dog_years: 6} @ {name, human_years: $(@ dog_years | * 7)}
{ name: 'Woofer', human_years: 42 }

# {dogs: [{name: "Barky"}, {name: "Woofer"}]} @ dogs:name:{name: ., yelling: $(upper)}
[ { name: 'Barky', yelling: 'BARKY' },
  { name: 'Woofer', yelling: 'WOOFER' } ]

# list {name: "Barky", dog_years: 5} {name: "Woofer", dog_years: 6} @ :{name, human_years: $(@ dog_years | * 7)}
[ { name: 'Barky', human_years: 35 },
  { name: 'Woofer', human_years: 42 } ]
```
