# hashpipe

Hashpipe is an experimental JSON-based shell. Imagine that Bash was designed for manipulating web APIs instead of a filesystem.

Featuring:

* JSON-typed input & output (strings, numbers, objects, and arrays)
* Alternative piping constructs (like the parallel pipe `||` and sequential pipe `|=`)
* Modular design (`use`ing modules and `alias`ing commands)

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
#| cat names.txt | split '\n' | match John | sort
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

Designed for easy interaction with JSON APIs

```coffee
#| get http://freegeoip.net/json
{ country_name: 'United States',
  region_name: 'California',
  city: 'Mountain View',
  zip_code: '94043' }

#| {encoded: 'SGV5IHRoZXJl'} | post http://spro.webscript.io/base64
{ decoded: 'Hey there' }
```
