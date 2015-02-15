# What's the weather like at Google?

Today I noticed that my search results were feeling laggy, and wondered if it might be caused by abnormally low temperatures at the Googleplex. Unlikely as that scenario sounds we can easily check up on them with Hashpipe.

Let's start by figuring out where Google's servers live. Maybe getting an IP address would help.

```coffee
#| use exec
#| exec "dig +short google.com"
'74.125.224.7\n74.125.224.0\n74.125.224.14\n74.125.224.2\n...'
```

By importing the `exec` module we are granted the `exec` command which will run system commands for us. Using the system `dig +short` command we can then get Google's IP addresses. But this line-based format is archaic, let's turn it into an array:

```coffee
#| split '\n'
[ '74.125.224.7',
  '74.125.224.0',
  '74.125.224.14',
  '74.125.224.2',
  ... ]
```

That's a bit easier on the eyes. Note that the last command's output will always be used as the next command's input, so no need to retype the `dig` command to `split` its lines.

Now let's grab the first IP result and save it:

```coffee
#| @ 0 | set ip
'74.125.224.7'
```

Again using the last command's output, we use an `@`-expression to get the first IP from the array and `set` it as `$ip`.

So we have an IP address, but weather tends to be based on physical location. Luckily freegeoip.net has a handy JSON API for geolocating IP addresses. Let's try that.

```coffee
#| get freegeoip.net/json/$ip | set where
{ ip: '74.125.224.7',
  country_name: 'United States',
  region_name: 'California',
  city: 'Mountain View',
  zip_code: '94043',
  latitude: 37.419,
  longitude: -122.058 }
```

Perfect, a full location including coordinates. I piped the result right into `set` to keep the results as `$where`.

From here we would just need... a JSON weather API that takes latitude & longitude? Lucky again, openweathermap.org offers just that:

```coffee
#| get api.openweathermap.org/data/2.5/weather {lat: $where @ latitude, lon: $where @ longitude} | set weather
{ main: 
   { temp: 283.35,
     humidity: 72,
     pressure: 1017.132,
     temp_min: 282.35,
     temp_max: 284.65 },
  wind: { speed: 1.77, deg: 58.0004 },
  clouds: { all: 0 },
  dt: 1423993404 }
```

Notice the second argument to the `get` command is a JSON object, which will be turned into a query string `"?lat=...&lon=..."` and added to the URL. This particular query object is built with `@`-expressions pulling the coordinates from the previous command's output.

Now we have what appears to be a firestorm on our hands with this 283 degree reading. It turns out this API returns temperature values as Kelvin, so to satisfy my feeble American mind a conversion is in order.

```coffee
#| alias k-to-f = - 273.15 | * 1.8 | + 32.0
#| $weather @ main.temp | k-to-f
50.36
```

That makes more sense. And it appears that it's a normal night in Mountain View, so maybe the lag was due to something else.

---

The full pipeline:

```coffee
#| exec "dig +short google.com" | split '\n' | @ 0 | set ip | get freegeoip.net/json/$ip | set where | get api.openweathermap.org/data/2.5/weather {lat: $where @ latitude, lon: $where @ longitude} @ main.temp | k-to-f
50.36
```

As an alias:

```coffee
#| alias server-temp = echo | exec "dig +short $!" | split '\n' | @ 0 | set ip | get freegeoip.net/json/$ip | set where | get api.openweathermap.org/data/2.5/weather {lat: $where @ latitude, lon: $where @ longitude} @ main.temp | k-to-f

#| server-temp news.ycombinator.com
51.50
```