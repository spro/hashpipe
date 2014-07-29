# hashpipe

hashpipe is an experimental shell with first-class objects and alternative piping constructs.

At a glance:

* IO with "slightly-typed" data
    * Numbers, strings, booleans
    * Objects, arrays
* Alternative pipeline constructs
    * Parallel `||` & series `|=` map
    * Conditional branching(?)
* Modular design
    * Commands are just functions
    * `use` modules to load commands

---

## Syntax crash course

### Commands

As in bash, a command is followed by space-separated arguments; arguments may
be literal values (objects, arrays, numbers, booleans, strings (quoted or bare
words)) or [sub-pipes](#sub-pipes).

```
# echo test
'test'

# list 1 2.5 3
[1, 2.5, 3]

# list hello "i am dog"
['hello', 'i am dog']
```

### Pipelines

A command's output may be piped to another command to be used as input with the
`|` operator.

```
# echo one two three
'one two three'

# echo one two three | split ' '
['one', 'two', 'three']
```

hashpipe also has special pipe operators that act over lists; the parallel `||`
and series `|=` pipes. Both map each item of the list through a single command
and return a new list of each result.

```
# list 1 2 3 || + 5
[6, 7, 8]

# list Tom Fred George || echo Sir $!
['Sir Tom', 'Sir Fred', 'Sir George']
```

### Variables

Variables are designated with `$` both when setting and getting.

```
# $day = 'Wednesday'
'Wednesday'

# echo I just realized today is $day.
'I just realized today is Wednesday.'

# list Tuesday $day tomorrow
['Tuesday', 'Wednesday', 'tomorrow']
```

The special variable `$!` references the output of the last command.

```
# list a b c | length | echo There were $! letters in there.
'There like 3 letters in there.'
```

### Sub-pipes

Create a sub-pipe with `$( command... )`. The sub-pipe is executed and
substituted with its result in the outer command's argument list.

```
# list $(4 | + 4) $(5 | - 5) $(6 | + 2)
[8, 0, 8]

# echo $( echo $( echo Turtles $( echo all the way down ) ) )
'Turtles all the way down'
```

Sub-pipes are passed the same input as the outer command.

```
# list 1 2 3 || echo $( * 2 ) "/ 2"
['2 / 2', '4 / 2', '6 / 2']
```

### Array and object literals

You've seen the `list [item]...` command a few times; the same can be written
with JSON-esque syntax:

```
# list 1 2 3
[1, 2, 3]

# [1, 2, 3]
[1, 2, 3]
```

Objects may also be defined either with the `obj [key] [value]` command or
JSON-esque syntax:

```
# obj first Freddy last Todd
{first: 'Freddy', last: 'Todd'}

# {first: "Freddy", last: "Todd"}
{first: 'Freddy', last: 'Todd'}

# [{a: 1}, obj "b" 2, {'d': 3}, list 4 5 6]
[{a: 1}, {b: 2}, {d: 3}, [4, 5, 6]]
```

Note that though strings may be either quoted or bare in the command syntax,
all strings must be quoted in the JSON-esque syntax.

### `@`-expressions

An `@`-expression is a special command suffix used to traverse and transform
objects, resulting in new objects or values. They may occur at the end of any
command. 

#### Getting with `.accessor`

The simplest use case for `@` is accessing the attributes of an object, or
items of an array, with the `.` or *get* operator. It is similar to the `.`
syntax for javascript objects, except that it applies to both object keys and
array indices.

```
# {name: "Fred", age: 42} @ .name
'Fred'
# ['a', 'b', 'c'] @ .0
'a'
```

We can chain attributes with `.` to descend further into an object:

```
# [{name: "Fred"}, {name: "Paul"}, {name: "Sam"}] @ .1.name
'Paul'
```

For simplicity, the leading `.` is implied.

```
# {name: "Fred", age: 42} @ name
'Fred'
```

#### Mapping with `:accessor`

To access one key of an array of objects, we can use the `:` or *map* operator.
The map operator applies an accessor to each item of an array, and returns a
new array with the results.

```
# [{name: "Fred"}, {name: "Paul"}, {name: "Sam"}] @ :name
['Fred', 'Paul', 'Sam']
```

Map also works for array indices. The *get* and *map* operators can be chained
freely:

```
# [{name: "Fred"}, {name: "Paul"}, {name: "Sam"}] @ :name:0
['F', 'P', 'S']
# [{name: "Fred"}, {name: "Paul"}, {name: "Sam"}] @ :name:0.0
'F'
```

#### Multi-get with `[expression, ...]`

With the multi-get syntax, several attributes can be plucked off a single
object to form an array.

```
# {name: "Fred", happy: true, kind: 'dog'} @ [name, happy]
['Fred', true]                                                    
```

The accessors within multi-get expressions are of course chainable:

```
# {name: "Sam", pets: [{name: 'Woofer'}, {name: 'Barky'}]} @ [name, pets:name]
['Sam', ['Woofer', 'Barky']]
```

#### Multi-get with `{key: expression, ...}`

Similar to the array-based multi-get, you can use the object-based multi-get to
return an object of named values. If an accessor expression is not specified,
the key name is used instead.

```
# {name: "Fred", happy: true, kind: 'dog'} @ {n: name, h: happy}
{n: 'Fred', h: true}

# {name: "Fred", happy: true, kind: 'dog'} @ {name, h: happy}
{name: 'Fred', h: true}
```

Again, chainable and nestable.

```
# $fred = {name: 'Fred', age: 42, happy: true}

# $fred @ [name, {age, happy}]
['Fred', {age: 42, happy: true}]

# $fred @ [name, {age, mood: {happy}}]
['Fred', {age: 42, mood: {happy: true}}]
```




