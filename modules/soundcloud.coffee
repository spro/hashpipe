request = require 'request'
qs = require 'querystring'
h = require 'highland'
somata = require 'somata'
log = somata.helpers.log
util = require 'util'
redis = require('redis').createClient()
_ = require 'underscore'

# Helper for logging with a [tag] prefix
dolog = h.curry (t, s) ->
    log "[#{ t }] " + util.inspect(s)[0..80].replace(/\s+/g, ' ')

# Fisher-Yates shuffling
shuffle = (a) ->
    for i in [a.length-1..1]
        j = Math.floor Math.random() * (i + 1)
        [a[i], a[j]] = [a[j], a[i]]
    a

# API Fetching
# ==============================================================================

# Default SoundCloud API arguments
consumer_key = "fc17d182cbdc4625d5a0b62322763759"
default_args =
    consumer_key: consumer_key
    json: true
default_limit = 50
default_limit_per = 50
chunk_length = 50

# Try fetching URLs cached in Redis before going to the API
cachedGetJson = (options, cb) ->

    # Save in redis as "cached:[url]"
    cache_key = 'cached:' + options.url
    redis.exists cache_key, (err, exists) ->

        if exists
            # Parse JSON right from redis if it exists
            redis.get cache_key, (err, cached_string) ->
                cached = JSON.parse cached_string
                cb null, cached

        else
            # Otherwise make the request
            request.get options, (err, res, data_string) ->
                redis.set cache_key, data_string # Cache the results
                data = JSON.parse data_string
                cb null, data

# Create a stream of data fetched from the API
fetchStream = (path, args, limit=default_limit) ->
    # Create a new stream and feed it
    stream = h()
    feedFetchStream stream, path, args, limit

    # Flatten (we're assuming arrays of data here) and enforce the limit with take
    return stream.flatten().take(limit)

# Feed an existing stream with data from the API
feedFetchStream = (stream, path, args, limit=default_limit, offset=0) ->
    # Create the query string by extending default args with given args
    query_args = h.extend default_args, {offset: offset, limit: default_limit_per}
    query_args = h.extend args, query_args if args?
    query_string = qs.stringify query_args

    # Build the full URL
    url = "http://api.soundcloud.com/#{path}.json?#{query_string}"
    req_options = url: url
    log "[fetch] #{ path }"

    # Make the request (or get cached)
    cachedGetJson req_options, (err, data) ->

        # Parse and feed the stream
        stream.write(data)

        if (data.length == chunk_length) and (offset + chunk_length < limit)
            # Continue feeding if we haven't reached the end of the data or the limit of our results
            feedFetchStream stream, path, args, limit, offset + chunk_length

        else
            # Close the stream if we're done
            stream.end()

    return stream # Return the stream for chainability

# Generic methods
# ------------------------------------------------------------------------------

# Resolve a Soundcloud URL
resolve = (url) ->
    if !url.match(/http.*soundcloud\.com/)?
        url = "http://soundcloud.com/" + url
    fetchStream("resolve", {url: url})
        #.doto(dolog "resolve #{ url }") # print each one

resolveOne = (url, cb) ->
    resolve(url).take(1).toArray ([i]) -> cb null, i

getResource = (path) ->
    fetchStream(path)

getTrack = (track) ->
    fetchStream("tracks/#{ track.id }")

getUser = (user) ->
    fetchStream("users/#{ user.id }")

# User methods
# ------------------------------------------------------------------------------

# Get a users's followings
getFollowings = (user, limit=10) ->
    fetchStream("users/#{ user.id }/followings", null, limit)
        #.doto(dolog "getFollowings #{ user.id }") # print each one

# Get a users's tracks
getTracks = (user, limit=50) ->
    fetchStream("users/#{ user.id }/tracks", null, limit)
        #.doto(dolog "getTracks #{ user.id }") # print each one

# Get a users's favorites
getFavorites = (user, limit=50) ->
    fetchStream("users/#{ user.id }/favorites", null, limit)
        #.doto(dolog "getFavorites #{ user.id }") # print each one

# Song methods
# ------------------------------------------------------------------------------

getSongFavoriters = (song, limit=50) ->
    fetchStream("tracks/#{ song.id }/favoriters", null, limit)
        #.doto(dolog "getSongFavorites #{ song_id }") # print each one

# Searches
# ------------------------------------------------------------------------------

searchTracks = (query, limit=50) ->
    fetchStream("tracks", q: query, limit)
        #.doto(dolog "searchTracks #{ query }") # print each one

searchUsers = (query, limit=50) ->
    fetchStream("users", q: query, limit)
        #.doto(dolog "searchUsers #{ query }") # print each one

# Export
# ==============================================================================

# Wrap stream methods as node-style callbacks for export

wrapStream = (method) ->
    (inp, args, ctx, cb) ->
        method(args...).toArray (got) -> cb null, got

wrapCallback = (method) ->
    (inp, args, ctx, cb) ->
        method args..., cb

# Return an object that applies f to every value of object o
mapobjwith = (f) -> (o) ->
    _.object(_.pairs(o).map ([k, v]) -> [k, f(v)])

module.exports = _.extend({}, mapobjwith(wrapStream)({
    resolve
    getResource
    getTrack
    getUser
    getFollowings
    getTracks
    getFavorites
    getSongFavoriters
    searchTracks
    searchUsers
}), mapobjwith(wrapCallback)({
    resolveOne
}))

console.log util.inspect module.exports
