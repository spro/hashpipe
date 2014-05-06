# pipeline

Pipeline is a DSL (and REPL) for traversing and manipulating JSON objects in a Unixy manner.

In action:

![](/docs/preview.png)

---

## Syntax

The pipeline syntax is based off that of bash, but specialized for manipulating and traversing JSON objects. The most similar aspect is the piping of subsequent commands. The most notable difference is the addition of the `@`-expression, which accesses object attributes (and more).

## `@`-expressions

An `@`-expression can occur after any command that has output. It acts as a member of the pipeline, taking in the output of the last command and feeding its own output to the next. Expressions consist of a series of operators that form a pipeline of their own.

### `@` is for attribute

The simplest use case for `@` is accessing the attributes of an object, or items of an array, with the `.` or *get* operator. The syntax mimics the `.` syntax of javascript objects, except that it applies to both object keys and array indices.

Let's say we have a command `dog_people` that outputs a list of two people and their dogs, as seen above. To access the second item of that list, we would use the numeric index 1:

```
> dog_people @ 1
```

... which leaves us with Fred, all alone with no dogs.

```js
{ name: "fred", dogs: [] }
```

We can chain attributes with `.` to descend further into the object:

```
> dog_people @ 1.name
```

Leaving us with just `"fred"`.

This of course can be extended as far into the object as necessary, e.g. to get the age of Woofer:

```
> dog_people @ 0.dogs.1.age
```

### Mapping with `:`

To access one key of an array of objects, we can use the `:` or *map* operator. The map operator applies an accessor to each item of an array.

```
> dog_people @ :dog
```

```js
["bill", "fred"]
```

---

*TODO:* Finish writing this. Readers: some `@` syntax is covered in https://github.com/spro/wwwsh/blob/master/docs/SYNTAX.md, but there is more to be said about the new parallel piping and sub-command features.

---

## Builtins

Echo:

```
> echo hello
"hello"
```

Identity:

```
> echo who am i? | id
"who am i?"
```

Arithmetic:

```
> + 4 20
24
> * 6 7 10
420
```
