# Exploring Hacker News with Hashpipe

*Note: The output in this walkthrough comes from a real run, but long arrays and
comment bodies are trimmed for visual convenience (`...`). The Hacker News front
page changes constantly, so your exact IDs, titles, and scores will differ.*

In this walkthrough you'll [retrieve data from a JSON API](#retrieving-api-data),
then learn a lot about
[using at-expressions to navigate the data](#navigating-json-with-at-expressions),
then apply your newfound skills to
[build complex pipelines](#building-complex-pipelines) to learn more about the
data.

## Retrieving API data

The [Firebase HN API](https://github.com/HackerNews/API) query for top stories
returns a list of post IDs:

```hashpipe
#| use http html keywords
#| http.get https://hacker-news.firebaseio.com/v0/topstories.json
[ 48614844, 48573902, 48608645, 48613755, 48616017, ... ]
```

We can get data for a single post using its ID:

```hashpipe
#| http.get https://hacker-news.firebaseio.com/v0/item/48614844.json
{
  by: 'toilet',
  descendants: 62,
  id: 48614844,
  kids: [ 48616086, 48616542, 48615354, 48615990, ... ],
  score: 150,
  time: 1782005740,
  title: "Developers don't understand CORS (2019)",
  type: 'story',
  url: 'https://fosterelli.co/developers-dont-understand-cors'
}
```

This would be a little easier if we did not have to type out
*"https://hacker-news.fire..."* every time, so let's save the API root in a
variable:

```hashpipe
#| $hn = "https://hacker-news.firebaseio.com/v0"
#| http.get $hn/topstories.json
[ 48614844, 48573902, 48608645, 48613755, 48616017, ... ]
```

### Making many requests in parallel

Using that array of story IDs, we could get full data for each post by making a
request to the `item/(id).json` endpoint. Hashpipe has a convenient parallel pipe
`||` that helps here. It passes each item in `$ids` to an individual `http.get`
request, returning the results as a new array.

The top stories endpoint currently returns hundreds of IDs, so we'll keep the
first 30. The slice `0..30` is end-exclusive.

```hashpipe
#| $ids = http.get $hn/topstories.json @ 0..30
[ 48614844, 48573902, 48608645, ... ]

#| $ids | length
30

#| $stories = $ids || http.get $hn/item/$!.json
[
  {
    by: 'toilet',
    descendants: 62,
    id: 48614844,
    kids: [ ... ],
    score: 150,
    time: 1782005740,
    title: "Developers don't understand CORS (2019)",
    type: 'story',
    url: 'https://fosterelli.co/developers-dont-understand-cors'
  },
  {
    by: 'luu',
    descendants: 2,
    id: 48573902,
    kids: [ ... ],
    score: 54,
    time: 1781718202,
    title: 'Zigzag Decoding with AVX-512',
    type: 'story',
    url: 'https://zeux.io/2026/06/17/zigzag-decoding-avx512/'
  },
  ...
]
```

Inside the mapped command, `$!` is the current story ID. Now `$stories` is a big
array of story objects. What can we do with it?

## Navigating JSON with at-expressions

### Getting an item's attributes with get operations

As a cautious first step, let's peek at the first object in `$stories`. Any
command can be followed by an *at-expression*, which is a suffix used to access
items in arrays or objects.

```hashpipe
#| $stories @ 0
{
  by: 'toilet',
  descendants: 62,
  id: 48614844,
  kids: [ 48616086, 48616542, 48615354, 48615990, ... ],
  score: 150,
  time: 1782005740,
  title: "Developers don't understand CORS (2019)",
  type: 'story',
  url: 'https://fosterelli.co/developers-dont-understand-cors'
}
```

This at-expression can be read as `get 0`, simply accessing item `0` of the
`$stories` array. Let's go deeper:

```hashpipe
#| $stories @ 0.id
48614844

#| $stories @ 0.title
"Developers don't understand CORS (2019)"

#| $stories @ 0.kids
[ 48616086, 48616542, 48615354, 48615990, ... ]

#| $stories @ 0.kids.3
48615990

#| $stories @ 0.kids.-1
48616144
```

The at-expressions I used there reach further into that first object. Every next
operation is added at the end of the at-expression, allowing you to access
deeply nested values such as `@ data.children.0.data.title`.

This is about equivalent to writing `stories[0].id` or `stories[0].kids[3]` in
JavaScript, but Hashpipe's `.` syntax is used for both array indexes and object
attributes.

### Getting multiple items' attributes with map operations

What about looking at data from *each* story?

```hashpipe
#| $stories @ :title
[
  "Developers don't understand CORS (2019)",
  'Zigzag Decoding with AVX-512',
  'Loupe – A iOS app that raises awareness about what native apps can see',
  'Renting a sewing machine from the library',
  ...
]

#| $stories @ :score
[ 150, 54, 238, 207, ... ]
```

Using the `:` map operator in an at-expression works similarly to a get
operation except it expects an array, and applies to each item in the array. In
JavaScript this would look something like
`stories.map(function(story) { return story.title; })`.

A map operation always outputs an array, so further operations can extract
specific items:

```hashpipe
#| $stories @ :title.10
"Public Service Announcement: Don't Say You Use AI for Writing"

#| $stories @ :kids.5
[ 48616187, 48616172, 48616037, 48615681, 48616150, ... ]

#| $stories @ :kids.5.0
48616187
```

### Reshaping objects with sub-expressions

One last feature of at-expressions is *sub-expressions* that can be used to
output new objects or arrays built out of existing values. That won't mean much
without a few examples.

Here's a full object to work with:

```hashpipe
#| $stories @ 10
{
  by: 'satisfice',
  descendants: 3,
  id: 48615776,
  kids: [ 48616565 ],
  score: 15,
  time: 1782017446,
  title: "Public Service Announcement: Don't Say You Use AI for Writing",
  type: 'story',
  url: 'https://www.satisfice.com/blog/archives/488148'
}
```

Now let's use sub-expressions to make new objects out of specific attributes:

```hashpipe
#| $stories @ 10.{title}
{ title: "Public Service Announcement: Don't Say You Use AI for Writing" }

#| $stories @ 10.{id, title}
{
  id: 48615776,
  title: "Public Service Announcement: Don't Say You Use AI for Writing"
}

#| $stories @ 10.{id, storyTitle: title, firstChild: kids.0}
{
  id: 48615776,
  storyTitle: "Public Service Announcement: Don't Say You Use AI for Writing",
  firstChild: 48616565
}
```

Sub-expressions work by taking a template object with keys and values, such as
`{storyTitle: title}`, and interpreting each value as an at-expression. For extra
convenience, when doing a single get operation where the key would match the
value name, the redundant expression can be omitted:

```hashpipe
#| $stories @ 10.{id: id, score: score}
{ id: 48615776, score: 15 }

#| $stories @ 10.{id, score}
{ id: 48615776, score: 15 }
```

Sub-expressions may be nested within sub-expressions:

```hashpipe
#| $stories @ 10.{basic: {id, title}}
{
  basic: {
    id: 48615776,
    title: "Public Service Announcement: Don't Say You Use AI for Writing"
  }
}

#| $stories @ 10.{basic: {id, title}, extra: {score, author: {by}}}
{
  basic: {
    id: 48615776,
    title: "Public Service Announcement: Don't Say You Use AI for Writing"
  },
  extra: { score: 15, author: { by: 'satisfice' } }
}
```

Sub-expressions also offer a syntax for creating arrays:

```hashpipe
#| $stories @ 10.[id, title]
[ 48615776, "Public Service Announcement: Don't Say You Use AI for Writing" ]

#| $stories @ 10.[id, title, kids.0]
[ 48615776, "Public Service Announcement: Don't Say You Use AI for Writing", 48616565 ]
```

Map an object shape over the full story list with `:{...}`:

```hashpipe
#| $stories @ :{id, title, by, score, comments: descendants}
[
  {
    id: 48614844,
    title: "Developers don't understand CORS (2019)",
    by: 'toilet',
    score: 150,
    comments: 62
  },
  {
    id: 48573902,
    title: 'Zigzag Decoding with AVX-512',
    by: 'luu',
    score: 54,
    comments: 2
  },
  ...
]
```

## Building complex pipelines

With a decent grasp of parallel piping and at-expressions, we can manipulate our
data more effectively and start building more complex and useful pipelines.

### Filtering and sorting stories

Lambdas make predicates readable. This keeps high-scoring stories and reshapes
the result:

```hashpipe
#| $stories | filter {| $(@ score) >= 100 } @ :{title, score, by}
[
  { title: "Developers don't understand CORS (2019)", score: 150, by: 'toilet' },
  {
    title: 'Loupe – A iOS app that raises awareness about what native apps can see',
    score: 238,
    by: 'Cider9986'
  },
  {
    title: 'Renting a sewing machine from the library',
    score: 207,
    by: 'sohkamyung'
  },
  ...
]
```

Sort by a field and take the top five with a slice:

```hashpipe
#| $stories | sortBy score @ -5..:{title, score, by}
[
  {
    title: 'Temporary Cloudflare accounts for AI agents',
    score: 203,
    by: 'farhadhf'
  },
  { title: 'Renting a sewing machine from the library', score: 207, by: 'sohkamyung' },
  {
    title: 'DOS Game "F-15 Strike Eagle II" reversing project needs DOS test pilots',
    score: 236,
    by: 'LowLevelMahn'
  },
  {
    title: 'Loupe – A iOS app that raises awareness about what native apps can see',
    score: 238,
    by: 'Cider9986'
  },
  { title: 'SMPTE Makes Its Standards Freely Accessible', score: 250, by: 'zdw' }
]
```

`sortBy score` sorts ascending by `score`; `-5..` takes the last five rows;
`:{...}` reshapes each row.

### Investigating power-submitters

Perhaps you're under the suspicion that every highly rated HN story is submitted
by a small group of karma champions. Hashpipe can let us know for sure.

We now know how to fetch attributes from each item of an array, so let's get a
big list of story submitters:

```hashpipe
#| $stories @ :by
[ 'toilet', 'luu', 'Cider9986', 'sohkamyung', 'surprisetalk', ... ]
```

Hashpipe includes a builtin `count` command that takes an array of items and
returns an array of items with counts, sorted from least to most frequent:

```hashpipe
#| $stories @ :by | count
[
  ...
  { item: 'saisrirampur', count: 1 },
  { item: 'zdw', count: 3 }
]
```

On this particular front page almost every story has a different submitter — only
`zdw` shows up more than once. So today there are no real power-submitters, but
the mechanics are the same. Let's isolate the five most frequent submitters'
usernames.

```hashpipe
#| $stories @ :by | count | tail 5
[
  { item: 'shpran', count: 1 },
  { item: 'dhorthy', count: 1 },
  { item: 'JumpCrisscross', count: 1 },
  { item: 'saisrirampur', count: 1 },
  { item: 'zdw', count: 3 }
]

#| $usernames = $stories @ :by | count | tail 5 @ :item
[ 'shpran', 'dhorthy', 'JumpCrisscross', 'saisrirampur', 'zdw' ]
```

Then we can use the HN API route `user/(username).json` to get data about each
user:

```hashpipe
#| $users = $usernames || http.get $hn/user/$!.json
[
  { created: 1779843383, id: 'shpran', karma: 80, submitted: [ ... ] },
  {
    about: 'building @ hlyr.dev',
    created: 1519951594,
    id: 'dhorthy',
    karma: 746,
    submitted: [ ... ]
  },
  ...
]
```

There's a lot of data in there, including the ID of every story and comment
they've submitted. Maybe we should just look at each user's ID, karma, and
number of submissions.

```hashpipe
#| $users @ :{id, karma, n_submitted: $(@ submitted | length)}
[
  { id: 'shpran', karma: 80, n_submitted: 32 },
  { id: 'dhorthy', karma: 746, n_submitted: 208 },
  { id: 'JumpCrisscross', karma: 186656, n_submitted: 50550 },
  { id: 'saisrirampur', karma: 1049, n_submitted: 361 },
  { id: 'zdw', karma: 150179, n_submitted: 8295 }
]
```

From the looks of it, the way to get more karma is to post more. Who would have
thought.

There's something I forgot to mention earlier: sub-pipes can be used in place of
at-expressions within sub-expressions. In this example we're making a new object
with a `n_submitted` key that equals the length of the user's `submitted` array,
by piping that array into the `length` command.

Sub-pipes can consist of any other command:

```hashpipe
#| $users @ :{id, karma, favorite_color: $( list red blue green | choice )}
[
  { id: 'shpran', karma: 80, favorite_color: 'green' },
  { id: 'dhorthy', karma: 746, favorite_color: 'red' },
  { id: 'JumpCrisscross', karma: 186656, favorite_color: 'blue' },
  ...
]
```

Here's a more complex example, calculating the average karma per submission for
each of these power users:

```hashpipe
#| $users @ :{id, avg_karma: $( @[ karma, $( @ submitted | length ) ] | / )}
[
  { id: 'shpran', avg_karma: 2.5 },
  { id: 'dhorthy', avg_karma: 3.5865384615384617 },
  { id: 'JumpCrisscross', avg_karma: 3.692502472799209 },
  ...
]
```

Broken down, that sub-pipe is first creating an array with the values `karma`
and `n_submissions`:

```hashpipe
#| $users @ 0.[karma, $( @ submitted | length )]
[ 80, 32 ]
```

Then it passes this array to the `/` division command, which handles a piped-in
array by dividing each item by the next:

```hashpipe
#| [ 80, 32 ] | /
2.5
```

Finally that value gets bundled into a sub-expression:

```hashpipe
#| $users @ -1.{id, avg_karma: $( @[ karma, $( @ submitted | length ) ] | / )}
{ id: 'zdw', avg_karma: 18.104761904761904 }
```

Unfortunately these numbers don't agree with HN's official averages on these
users' profiles, so maybe this strategy has some flaws. It's possible that HN
has some weighted karma algorithm that would skew the results.

### Counting story keywords

```hashpipe
#| $stories @ :title
[
  "Developers don't understand CORS (2019)",
  'Zigzag Decoding with AVX-512',
  'Loupe – A iOS app that raises awareness about what native apps can see',
  'Renting a sewing machine from the library',
  ...
]
```

Using a parallel pipe we can send each item of this array to one command and get
an array of results back. Let's normalize by applying the `lower` command to
each title:

```hashpipe
#| $stories @ :title || lower
[
  "developers don't understand cors (2019)",
  'zigzag decoding with avx-512',
  'loupe – a ios app that raises awareness about what native apps can see',
  'renting a sewing machine from the library',
  ...
]
```

Now by passing each lower-cased title to a `split` command, we can get an array
of words per title:

```hashpipe
#| $stories @ :title || lower || split ' '
[
  [ 'developers', "don't", 'understand', 'cors', '(2019)' ],
  [ 'zigzag', 'decoding', 'with', 'avx-512' ],
  [ 'loupe', '–', 'a', 'ios', 'app', 'that', 'raises', 'awareness', ... ],
  ...
]
```

And passing that whole array of arrays to the `flatten` command gives us a
single array of words:

```hashpipe
#| $stories @ :title || lower || split ' ' | flatten
[ 'developers', "don't", 'understand', 'cors', '(2019)', 'zigzag', 'decoding', ... ]
```

Using the `count` command on that array of words:

```hashpipe
#| $stories @ :title || lower || split ' ' | flatten | count
[
  ...
  { item: 'to', count: 3 },
  { item: 'project', count: 3 },
  { item: 'of', count: 4 },
  { item: 'a', count: 5 },
  { item: 'ai', count: 5 },
  { item: 'the', count: 6 },
  { item: 'for', count: 6 }
]
```

As you might have expected, this is not super useful information; the most
common words are the most common English words.

To make this sort of thing easier there is a module packaged with Hashpipe which
includes a `keywords` command. It normalizes the text, extracts actual words,
and removes common English words.

```hashpipe
#| $stories @ :title || keywords
[
  [ 'developers', 'understand', 'cors' ],
  [ 'zigzag', 'decoding', 'avx' ],
  [ 'loupe', 'ios', 'app' ],
  ...
]

#| $stories @ :title || keywords | flatten | count
[
  ...
  { item: 'show', count: 2 },
  { item: 'hn', count: 2 },
  { item: 'test', count: 2 },
  { item: 'dos', count: 2 },
  { item: 'project', count: 3 },
  { item: 'ai', count: 5 }
]
```

We can be a bit more selective by using the `without` command to exclude some of
the less interesting words:

```hashpipe
#| $stories @ :title || keywords | flatten | without yc hn ask show now end new time | count
[
  ...
  { item: 'linux', count: 2 },
  { item: 'brain', count: 2 },
  { item: 'test', count: 2 },
  { item: 'dos', count: 2 },
  { item: 'project', count: 3 },
  { item: 'ai', count: 5 }
]
```

### Fetching comments

Every story has an array of comment IDs called `kids`. Comments are retrieved
from the API using the same `item/(id).json` route as earlier. Let's use a story
with a lively comment section:

```hashpipe
#| $story = $stories @ 3
{
  by: 'sohkamyung',
  descendants: 105,
  id: 48613755,
  kids: [ 48614129, 48614733, 48616607, 48616415, ... ],
  score: 207,
  time: 1781996051,
  title: 'Renting a sewing machine from the library',
  type: 'story',
  url: 'https://www.bbc.com/future/article/20260618-the-weird-and-wonderful-libraries-of-finland'
}

#| $comment_ids = $story @ kids.0..3
[ 48614129, 48614733, 48616607 ]

#| $comments = $comment_ids || http.get $hn/item/$!.json
[
  {
    by: 'ElijahLynn',
    id: 48614129,
    kids: [ 48615109, 48614734, 48614216 ],
    parent: 48613755,
    text: 'My local library which is part of the Washington county Library system (next to Portland)...<p>...PDX has it going on!!!',
    time: 1781998582,
    type: 'comment'
  },
  {
    by: 'cuvinny',
    id: 48614733,
    kids: [ 48615687, 48615230 ],
    parent: 48613755,
    text: 'My library has something similar. Sewing and embroidering machines, 3D printers and even a CNC machine...<p>This is the Charleston County library system.',
    time: 1782004513,
    type: 'comment'
  },
  {
    by: 'infl8ed',
    id: 48616607,
    parent: 48613755,
    text: 'My local library has a few interesting things like this including a podcast kit...',
    time: 1782028020,
    type: 'comment'
  }
]
```

HN comment text is HTML, so use the `html` module to make it readable while
reshaping. `html.html2text` strips the tags, decodes entities, and joins
paragraphs with ` ... `:

```hashpipe
#| $comments @ :{
  by,
  text: $( @ text | html.html2text )
}
[
  {
    by: 'ElijahLynn',
    text: "My local library which is part of the Washington county Library system (next to Portland). It's where Hillsboro is, which is where Intel's manufacturing is, also called Silicon Forest, has a Library Of Things! ... I've checked out a KitchenAid stand mixer, synthesizer, guitar... ... PDX has it going on!!!"
  },
  {
    by: 'cuvinny',
    text: 'My library has something similar. Sewing and embroidering machines, 3D printers and even a CNC machine... ... This is the Charleston County library system.'
  },
  {
    by: 'infl8ed',
    text: 'My local library has a few interesting things like this including a podcast kit (i.e. professional microphones and mixers)... I approve wholeheartedly of these and similar initiatives.'
  }
]
```

This only gives us the top level of comments. Fetching replies requires further
requests for each reply ID in each comment's `kids` array.

### Building a reusable story command

The fetch-and-shape pattern is useful enough to name:

```hashpipe
#| def hn-story { $id |
  http.get $hn/item/$id.json @ {
    id,
    title,
    by,
    score,
    comments: descendants,
    url
  }
}
{ success: true, def: 'hn-story', src: '{ $id | http.get $hn/item/$id.json @ { ... } }' }
```

Now it works with an argument:

```hashpipe
#| hn-story $($ids @ 0)
{
  id: 48614844,
  title: "Developers don't understand CORS (2019)",
  by: 'toilet',
  score: 151,
  comments: 63,
  url: 'https://fosterelli.co/developers-dont-understand-cors'
}
```

And as a mapped command:

```hashpipe
#| $ids @ 0..10 || hn-story
[
  {
    id: 48614844,
    title: "Developers don't understand CORS (2019)",
    by: 'toilet',
    score: 151,
    comments: 63,
    url: 'https://fosterelli.co/developers-dont-understand-cors'
  },
  {
    id: 48573902,
    title: 'Zigzag Decoding with AVX-512',
    by: 'luu',
    score: 55,
    comments: 2,
    url: 'https://zeux.io/2026/06/17/zigzag-decoding-avx512/'
  },
  ...
]
```

### A compact script

Putting the core workflow together:

```hashpipe
use http html keywords

$hn = "https://hacker-news.firebaseio.com/v0"
$ids = http.get $hn/topstories.json @ 0..30
$stories = $ids || http.get $hn/item/$!.json

def summarize-story {| @ {title, by, score, comments: descendants, url} }

$stories
  | sortBy score
  @ -10..
  || summarize-story
```

```hashpipe
[
  {
    title: 'When I reject AI code even if it works',
    by: 'vnbrs',
    score: 158,
    comments: 86,
    url: 'https://vinibrasil.com/when-i-reject-ai-code-even-if-it-works/'
  },
  {
    title: 'Slow breathing modulates brain function and risk behavior',
    by: 'croes',
    score: 168,
    comments: 36,
    url: 'https://www.cell.com/neuron/fulltext/S0896-6273(26)00339-9'
  },
  ...
]
```

The same pieces scale to larger workflows: use `@` for traversal and reshaping,
`||` for parallel API calls, lambdas for predicates and reusable commands, and
slices to keep live API examples bounded.
