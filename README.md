# hashpipe

Hashpipe is an experimental JSON-based shell. Imagine that Bash was designed for manipulating web APIs instead of a filesystem.

**[Try it in your browser →](https://spro.github.io/hashpipe/)**

Featuring:

* JSON-typed input & output (strings, numbers, objects, and arrays)
* Alternative piping constructs (like the parallel pipe `||` and sequential pipe `|=`)
* First-class functions (lambda literals like `{| * 2 }` and named commands via `def`)
* Modular design (`use` modules to unlock namespaced commands like `http.get` and `files.cat`)

## Getting started


### Installation

```coffee
$ npm install -g hashpipe
$ hashpipe
#|
```

### At a glance

Bash-like command pipelines

```coffee
#| use files
#| files.cat names.txt | split '\n' | match John | sort
[ 'John Adams',
  'John King',
  'John Lee',
  'John Mitchell' ]
```

[Parallel and series pipes](https://github.com/spro/hashpipe/blob/master/docs/Syntax.md#at-expressions) to map commands over arrays

```coffee
#| [1, 3, 4, 12] || * 5
[ 5, 15, 20, 60 ]

#|  echo john jacob jingleheimer | split ' ' || upper
[ 'JOHN', 'JACOB', 'JINGLEHEIMER' ]
```

Special [`@` syntax](https://github.com/spro/hashpipe/blob/master/docs/Syntax.md#at-expressions) for traversing JSON objects and arrays

```coffee
#| ['a', 'b', 'c'] @ 0
'a'

#| {name: "George", age: 55} @ name
'George'

#| [{name: "Fred"}, {name: "Jerry"}, {name: "Tim"}] @ :name
[ 'Fred', 'Jerry', 'Tim' ]
```

[Lambdas and named functions](https://github.com/spro/hashpipe/blob/master/docs/Syntax.md#functions) for reusable pipelines

```coffee
#| [1, 2, 3] | map {| * 2 }
[ 2, 4, 6 ]

#| def human-years { $n | $n * 7 }
#| human-years 6
42

#| def dog-years {| * 7}
#| 6 | dog-years
42
```

Designed for easy interaction with JSON APIs

```coffee
#| use http
#| http.get http://www.telize.com/geoip
{ country: 'United States',
  region: 'California',
  city: 'Mountain View',
  postal_code: '94043' }

#| {encoded: 'SGV5IHRoZXJl'} | http.post http://spro.webscript.io/base64
{ decoded: 'Hey there' }
```

## Learning more

Try one of the Hashpipe walkthroughs to see it in action:

* [What's the weather like at Google?](https://github.com/spro/hashpipe/blob/master/docs/walkthroughs/GoogleWeather.md)
* [Exploring Hacker News with Hashpipe](https://github.com/spro/hashpipe/blob/master/docs/walkthroughs/HN.md)
