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
words)) or (sub-commands)[#Sub-commands].

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

Here's where things deviate from the known path.

An `@`-expression can occur after any command that has output. It acts as a
member of the pipeline, taking in the output of the last command and feeding
its own output to the next. Expressions consist of a series of operators that
form a pipeline of their own.

#### `@` is for attribute

The simplest use case for `@` is accessing the attributes of an object, or
items of an array, with the `.` or *get* operator. The syntax mimics the `.`
syntax of javascript objects, except that it applies to both object keys and
array indices.

Let's say we have a command `dog_people` that outputs a list of two people and
their dogs, as seen above. To access the second item of that list, we would use
the numeric index 1:

```
# dog_people @ 1
```

... which leaves us with Fred, all alone with no dogs.

```js
{ name: "fred", dogs: [] }
```

We can chain attributes with `.` to descend further into the object:

```
# dog_people @ 1.name
```

Leaving us with just `"fred"`.

This of course can be extended as far into the object as necessary, e.g. to get
the age of Woofer:

```
# dog_people @ 0.dogs.1.age
```

### Mapping with `:`

To access one key of an array of objects, we can use the `:` or *map* operator.
The map operator applies an accessor to each item of an array.

```
# dog_people @ :dog
```

```js
["bill", "fred"]
```

---

*TODO:* Finish writing this. Readers: some `@` syntax is covered in
https://github.com/spro/wwwsh/blob/master/docs/SYNTAX.md, but there is more to
be said about the new parallel piping and sub-command features.

---

## Builtins

Echo:

```
# echo hello
"hello"
```

Identity:

```
# echo "who am i?"
"who am i?"
# echo "who am i?" | id
"who am i?"
```

Arithmetic:

```
# + 1 2
3
# * 6 7 10
420
```
