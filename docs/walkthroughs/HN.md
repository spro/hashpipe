# Exploring Hacker News with Hashpipe

*Note: Some of the output in this walkthrough is trimmed for visual convenience.*

In this walkthrough you'll [retreive data from a JSON API](#retreiving-api-data), then learn a lot about [using at-expressions to navigate the data](#navigating-json-with-at-expressions), then apply your newfound skills to [build complex pipelines](#building-complex-pipelines) to learn more about the data.

## Retreiving API data

The [Firebase HN API](https://github.com/HackerNews/API) query for "top stories" returns a list of post IDs:

```coffee
#| get https://hacker-news.firebaseio.com/v0/topstories.json
[ 9053496, 9053286, 9052925, 9053621, 9053694, ... ]
```

We can get data for a single post using its ID:

```coffee
#| get https://hacker-news.firebaseio.com/v0/item/9050970.json
{ id: 9050970,
  time: 1423952713,
  title: 'Show HN: A Unixy approach to WebSockets',
  by: 'joewalnes',
  url: 'http://websocketd.com/'
  score: 232,
  type: 'story',
  kids: [ 9051031, 9051402, ... ],
  text: '' }
```

This would be a little easier if we didn't have to type out *"http://hacker-news.fire..."* every time, so let's set that as a variable:

```coffee
#| set hnapi https://hacker-news.firebaseio.com/v0
#| get $hnapi/topstories.json
[ 9053496, 9053286, 9052925, 9053621, 9053694, ... ]
```

### Making many requests in parallel

Using that array of story IDs, we could get full data for each post by making a request to the `items/(id).json` endpoint. Hashpipe has a convenient parallel pipe `||` that will help to acheive this. This is going to pass each item in `$ids` to an individual `get` request, returning the results as a new array.

```coffee
#| get $hnapi/topstories.json | set ids
[ 9053496, 9053286, 9052925, 9053621, 9053694, ... ]

#| $ids | length
100

#| $ids || get $hnapi/item/$!.json | set stories
[ { id: 9053496,
    time: 1424025204,
    title: '64-bit Linux Return-Oriented Programming',
    by: 'wglb',
    url: 'http://crypto.stanford.edu/~blynn/rop/',
    score: 49 },
  { id: 9053286,
    time: 1424021915,
    title: 'Asynchronous Python and Databases',
    by: 'zzzeek',
    url: 'http://techspot.zzzeek.org/2015/02/15/asynchronous-python-and-databases/',
    score: 39 },
  { id: 9052925,
    time: 1424015883,
    title: '1-2 year SSD wear on build boxes has been minimal',
    by: 'jontro',
    url: 'http://lists.dragonflybsd.org/pipermail/users/2015-February/207469.html',
    score: 64 },  ... ]
```

Now `$stories` is a big array of story objects. What can we do with it?

## Navigating JSON with at-expressions

### Getting an item's attributes with `.` (get) operations

As a cautious first step, let's peek at the first object in `$stories`. Any command can be followed by an *at-expression*, which is a special suffix used to access items in arrays or objects.

```coffee
#| $stories @ .0
{ id: 9053496,
  time: 1424025204,
  title: '64-bit Linux Return-Oriented Programming',
  by: 'wglb',
  url: 'http://crypto.stanford.edu/~blynn/rop/',
  kids: [ 9054176, 9054023, 9053995, 9053862, 9053674, 9053742 ],
  score: 49 }
```

This at-expression uses the `.` **(get)** operator and can be read as `get 0`, simply accessing item `0` of the `$stories` array (the first story object). Let's go deeper...

```coffee
#| $stories @ .0 .id
9053496

#| $stories @ 0.title
'64-bit Linux Return-Oriented Programming'

#| $stories @ 0 . kids
[ 9054176, 9054023, 9053995, 9053862, 9053674, 9053742 ]

#| $stories @ 0.kids.3
9053862

#| $stories @ 0.kids.-1
9053742
```

The at-expressions I used there reach further into that first object. Every next operation is just added at the end of the at-expression, allowing you to access deeply nested values such as `@ data.children.0.data.title` (a real example from the Reddit API).

This is about equivalent to writing `stories[0].id` or `stories[0].kids[3]` in Javascript &mdash; but Hashpipe's `.` syntax is used for both array indexes and object attributes.

*Note:* The above examples show that a `.` is implied for the first operation if not specified, and also that the spacing around `.` does not matter (though I usually leave them out).

### Getting multiple items' attributes with `:` (map) operations

What about looking at data from *each* story?

```coffee
#| $stories @ :title
[ '64-bit Linux Return-Oriented Programming',
  'Asynchronous Python and Databases',
  '1-2 year SSD wear on build boxes has been minimal',
  'Excoin exchange\'s Bitcoins stolen, will be shutting down',
  'Show HN: Vivaldi programming language',
  ... ]

#| $stories @ :score
[ 49, 39, 64, 75, 21, ... ]
```

Using the `:` **(map)** operator in an at-expression works similarly to the `.` **(get)** operator except it expects an array, and applies to each item in the array. In Javascript this would look something like `stories.map(function(story) { return story.title; })`

A map operation always outputs an array, so further operations can extract specific items:

```coffee
#| $stories @ :title.10
'Zero size objects'

#| $stories @ :kids.5
[ 9054092 ]

#| $stories @ :kids.5.0
9054092
```

### Reshaping objects with sub-expressions

One last feature of at-expressions is *sub-expressions* that can be used to output new objects or arrays built out of existing values. That won't mean much without a few examples.

Here's a full object to work with:

```coffee
#| $stories @ 10
{ by: 'zdw',
  id: 9052735,
  kids: [ 9054140, 9054088, 9053550, 9053989 ],
  score: 48,
  text: '',
  time: 1424012175,
  title: 'Zero size objects',
  type: 'story',
  url: 'http://www.tedunangst.com/flak/post/zero-size-objects' }
```

Now let's use sub-expressions to make new objects out of specific attributes:

```coffee
#| $stories @ 10 . {title: .title}
{ title: 'Zero size objects' }

#| $stories @ 10 . {id: .id, title: .title}
{ id: 9052735, title: 'Zero size objects' }

#| $stories @ 10 . {id: id, storyTitle: title, firstChild: kids.0}
{ id: 9052735,
  storyTitle: 'Zero size objects',
  firstChild: 9054140 }
```

Sub-expressions work by taking a "template" object with keys and values (e.g. `{storyTitle: .title}`) and interpreting each value (e.g. `.title`) as an at-expression. As with regular at-expressions the first `.` operation may be omitted.

For extra convenience, when doing a single get operation where the key would match the value name (e.g. `title: .title`), the redundant expression can be omitted:

```coffee
#| $stories @ 10.{id: id, score: score}
{ id: 9052735, score: 48 }

#| $stories @ 10.{id, score}
{ id: 9052735, score: 48 }
```

Sub-expressions may be nested within sub-expressions:

```coffee
#| $stories @ 10 . {basic: {id, title}}
{ basic: { id: 9052735, title: 'Zero size objects' } }

#| $stories @ 10 . {basic: {id, title}, extra: {votes: score, author: {name: .by}}}
{ basic: { id: 9052735, title: 'Zero size objects' },
  extra: { votes: 48, author: { name: 'zdw' } } }
```

Sub-expressions also offer a syntax for creating arrays:

```coffee
#| $stories @ 10 . [.id, .title]
[ 9052735, 'Zero size objects', 48 ]

#| $stories @ 10.[id, title, kids.0]
[ 9052735, 'Zero size objects', 9054140 ]
```

## Building complex pipelines

With a decent grasp of parallel piping and at-expressions, we can manipulate our data more effectively and start building some more complex (and useful) pipelines.

### Investigating power-submitters

Perhaps you're under the suspicion that every highly rated HN story is submitted by a small group of karma champions. Hashpipe can let us know for sure.

We now know how to fetch attributes from each item of an array, so let's get a big list of story submitters:

```coffee
#| $stories @ :by
[ 'wglb',
  'zzzeek',
  'jontro',
  'dewey',
  'jeorgun',
  ... ]
```

Hashpipe includes a builtin `count` command that takes an array of items and returns an array of items with counts:

```coffee
#| $stories @ :by | count
[ ...
  { item: 'Reltair', count: 1 },
  { item: 'wallflower', count: 2 },
  { item: 'desdiv', count: 2 },
  { item: 'boh', count: 2 },
  { item: 'nkurz', count: 2 },
  { item: 'xkarga00', count: 3 },
  { item: 'lelf', count: 4 } ]
```

Right away we can see there may be some true power-submitters. But are they karma champions? Let's isolate the top 5 submitters' usernames.

```coffee
#| $stories @ :by | count | tail 5
[ { item: 'desdiv', count: 2 },
  { item: 'boh', count: 2 },
  { item: 'nkurz', count: 2 },
  { item: 'xkarga00', count: 3 },
  { item: 'lelf', count: 4 } ]

#| $stories @ :by | count | tail 5 @ :item | set usernames
[ 'desdiv',
  'boh',
  'nkurz',
  'xkarga00',
  'lelf' ]
```

Then we can use the HN API route `user/(username).json` to get data about each user:

```coffee
#| $usernames || get $hnapi/user/$!.json | set users
[ { id: 'desdiv',
    karma: 828,
    about: '',
    submitted: [ 9054060, 9053993, 9053741, 9053716, 9053148, ... ] },
  { id: 'boh',
    karma: 4038,
    about: '',
    submitted: [ 9053693, 9053255, 9000137, 8948408, 8923793, ... ] },
  { id: 'nkurz',
    karma: 20463,
    about: 'I\'m almost done wrapping up my glorious but ...',
    submitted: [ 9053795, 9053718, 9053670, 9051695, 9015162, ... ] },
  { id: 'xkarga00',
    karma: 1356,
    about: '',
    submitted: [ 9053377, 9053372, 9051473, 9051456, 9051418, ... ] },
  { id: 'lelf',
    karma: 28218,
    about: 'Antonio Nikishaev, me at lelf.lu, http ...',
    submitted: [ 9053245, 9053059, 9052209, 9049652, 9049597, ... ] } ]
```

There's a lot of data in there (including the ID of every story and comment they've ever submitted). Maybe we should just look at each user's ID (username), karma, and number of submissions.

```coffee
#| $users @ :{id, karma, n_submitted: $(@submitted | length)}
[ { id: 'desdiv',
    karma: 828,
    n_submitted: 274 },
  { id: 'boh',
    karma: 4038,
    n_submitted: 632 },
  { id: 'nkurz',
    karma: 20463,
    n_submitted: 2280 },
  { id: 'xkarga00',
    karma: 1356,
    n_submitted: 228 },
  { id: 'lelf',
    karma: 28218,
    n_submitted: 2253 } ]
```

From the looks of it, the way to get more karma is to post more. Who would have thought.

There's something I forgot to mention earlier: sub-pipes can be used in place of at-expressions within sub-expressions. In this example we're making a new object with a `n_submitted` key that equals the length of the user's `submitted` array, by piping that array into the `length` command. 

*Note:* In the beginning of that sub-pipe the `@` is necessary to let Hashpipe know we're trying to use an at-expression again. Sub-pipes can consist of any other command: 

```coffee
#| $users @ :{id, karma, favorite_color: $( list red blue green | choice )}
[ { id: 'desdiv',
    karma: 846,
    favorite_color: 'blue' },
  { id: 'boh',
    karma: 4051,
    favorite_color: 'green' },
  { id: 'nkurz',
    karma: 20480,
    favorite_color: 'red' },
  { id: 'xkarga00',
    karma: 1356,
    favorite_color: 'red' },
  { id: 'lelf',
    karma: 28221,
    favorite_color: 'green' } ]
```

Here's a more complex example, calculating the average karma per submission for each of these power-users:

```coffee
#| $users @ :{id, avg_karma: $( @[ karma, $( @submitted | length ) ] | / )}
[ { id: 'desdiv',
    avg_karma: 3.021897810218978 },
  { id: 'boh', avg_karma: 6.389240506329114 },
  { id: 'nkurz', avg_karma: 8.975 },
  { id: 'xkarga00',
    avg_karma: 5.947368421052632 },
  { id: 'lelf', avg_karma: 12.52463382157124 } ]
```

Broken down, that sub-pipe is first creating an array with the values [`karma`, `n_submissions`] ...

```coffee
#| $users @ 0. [ karma, $( @submitted | length ) ]
[ 828, 274 ]
```

... and then passing this array to the `/` (division) command, which handles a piped-in array by dividing each item by the next ...

```coffee
#| [ 828, 274 ] | /
3.021897810218978
```

... then bundled into a sub-expression.

```coffee
#| $users @ -1 . {id, avg_karma: $( @[ karma, $( @submitted | length ) ] | / ) }
{ id: 'lelf',
  avg_karma: 12.52463382157124 }
```

Unfortunately these numbers don't agree with HN's official averages on these users' profiles, so maybe this strategy has some flaws. It's possible that HN has some weighted karma algorithm that would skew the results.


### Counting story keywords

```coffee
#| $stories @ :title
[ '64-bit Linux Return-Oriented Programming',
  'Asynchronous Python and Databases',
  '1-2 year SSD wear on build boxes has been minimal',
  'Excoin exchange\'s Bitcoins stolen, will be shutting down',
  'Show HN: Vivaldi programming language',
  ... ]
```

Using a parallel pipe we can send each item of this array to one command and get an array of results back. Let's normalize by applying the `lower` command to each title:

```coffee
#| $stories @ :title || lower 
[ '64-bit linux return-oriented programming',
  'asynchronous python and databases',
  '1-2 year ssd wear on build boxes has been minimal',
  'excoin exchange\'s bitcoins stolen, will be shutting down',
  'show hn: vivaldi programming language',
  ... ]
```

Now by passing each lower-cased title to a `split` command, we can get an array of words per title:

```coffee
#| $stories @ :title || lower || split ' '
[ [ '64-bit',
    'linux',
    'return-oriented',
    'programming' ],
  [ 'asynchronous',
    'python',
    'and',
    'databases' ],
  [ '1-2',
    'year',
    'ssd',
    'wear',
    ... ]
 ... ]
```

And passing that whole array of arrays to the `flatten` command we can get a single array of words:

```coffee
#| $stories @ :title || lower || split ' ' | flatten
[ '64-bit',
  'linux',
  'return-oriented',
  'programming',
  'asynchronous',
  'python',
  'and',
  'databases',
  ... ]
```

Using the `count` command on that array of words:

```coffee
#| $stories @ :title || lower || split ' ' |  flatten | count
[ ...
  { item: 'for', count: 9 },
  { item: 'show', count: 10 },
  { item: 'of', count: 13 },
  { item: 'to', count: 13 },
  { item: 'hn:', count: 16 },
  { item: 'a', count: 16 },
  { item: 'the', count: 27 } ]
```

As you might have expected, this isn't super useful information; the most common words are the most common English words.

To make this sort of thing easier there's a module packaged with Hashpipe which includes a `keywords` command. It will handle normalizing the text, extracting actual words (not punctuation, numbers, etc.) and removing common English words.

```coffee
#| use keywords
#| $stories @ :title || keywords
[ [ 'bit',
    'linux',
    'return',
    'oriented',
    'programming' ],
  [ 'asynchronous',
    'python',
    'databases' ],
  [ 'year',
    'ssd',
    'wear',
    'build',
    'boxes',
    'minimal' ],
  ... ]

#| $stories @ :title || keywords | flatten | count
[ ...
  { item: 'time', count: 3 },
  { item: 'new', count: 4 },
  { item: 'end', count: 4 },
  { item: 'programming', count: 4 },
  { item: 'yc', count: 5 },
  { item: 'ask', count: 5 },
  { item: 'show', count: 10 },
  { item: 'hn', count: 16 } ]
```

We can be a bit more selective by using the `without` command to exclude some of the less interesting words (though it is interesting that so many words about time are prevalent).

```coffee
#| $stories @ :title || keywords | flatten | without yc hn ask show now end new time | count
[ ...
  { item: 'hiring', count: 3 },
  { item: 'go', count: 3 },
  { item: 'data', count: 3 },
  { item: 'linux', count: 3 },
  { item: 'science', count: 3 },
  { item: 'programming', count: 4 } ]
```

### Fetching comments

Every story has an array of comment IDs called `kids`. Comments are retreived from the API using the same `item/(id).json` route as earlier.

```coffee
#| $stories @ 10.kids
[ 9054140, 9054088, 9053550, 9053989 ]

#| $stories @ 10.kids || get $hnapi/item/$!.json | set comments
[ { id: 9054140,
    by: 'TheLoneWolfling',
    text: 'It should be possible to use a SMT solver to ...',
    kids: undefined },
  { id: 9054088,
    by: 'barrkel',
    text: 'The mentality of compiler authors writing these ..',
    kids: [ 9054122, 9054126, 9054171 ] },
  { id: 9053550,
    by: 'rav',
    text: 'In 2013, LWN had an article on Optimization-unsafe ...',
    kids: [ 9054138 ] },
  { id: 9053989,
    by: 'rwmj',
    text: 'This just makes the case for a safe subset of C ...',
    kids: [ 9054051 ] } ]
```

This only gives us the top level of comments, fetching replies will require further requests for each reply ID in each comment's `kids` array.

```coffee
```

*To be continued...*