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
```

### Basic usage

Bash-like command pipelines

```coffee
# cat names.txt | split '\n' | match John | sort
[ 'John Adams',
  'John King',
  'John Lee',
  'John Mitchell' ]
```

Parallel pipe to map commands over arrays

```coffee
# [1, 3, 4, 12] || * 5
[ 5, 15, 20, 60 ]

#  echo John Jacob Jingleheimer | split ' ' || upper
[ 'JOHN', 'JACOB', 'JINGLEHEIMER' ]
```

Special `@` syntax for nagivating JSON objects and arrays

```coffee
# {name: "George", age: 55} @ name
'George'

# [1, 2, 3] @ 0
1

# [{name: "Fred"}, {name: "Jerry"}, {name: "Tim"}] @ 2.name
'Tim'
```

Designed for easy interaction with JSON APIs

```coffee
# {encoded: 'SGV5IHRoZXJl'} | post http://spro.webscript.io/base64
{ decoded: 'Hey there' }

# get http://reddit.com/r/worldnews.json @ data.children:data:{title, score} | sort -score
[ { title: 'Shooting at Danish blasphemy seminar',
    score: 4864 },
  { title: 'Protests across Pakistan to denounce Taliban.',
    score: 4851 },
  { title: '‘Anonymous’ hacking group shuts down over 800 Islamic State Twitter accounts',
    score: 3306 },
  ... ]
  
# get http://api.statdns.com/google.com/a @ answer.0.rdata | set ip | get http://freegeoip.net/json/$ip
{ ip: '173.194.65.101',
  country_name: 'United States',
  region_name: 'California',
  city: 'Mountain View',
  zip_code: '94043',
  latitude: 37.419,
  longitude: -122.058 }
```
