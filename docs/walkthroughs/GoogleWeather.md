# What's the weather like at Google?

Today I noticed that my search results were feeling laggy, and wondered if it
might be caused by abnormally low temperatures at the Googleplex. Unlikely as
that scenario sounds, we can check up on them with Hashpipe.

This walkthrough uses DNS, IP geolocation, a JSON weather API, and a reusable
Hashpipe command. The weather request uses
[Open-Meteo](https://open-meteo.com/en/docs), which accepts latitude and
longitude directly and does not need an API key for this basic forecast request.

The outputs below come from a real run. Because every step hits a live service,
your exact IP addresses, coordinates, and weather numbers will differ.

Let's start by figuring out where Google's servers live. Maybe getting an IP
address would help.

```hashpipe
#| use exec
#| exec.cmd "dig +short google.com"
'142.251.34.206\n'
```

By importing the `exec` module we can call the namespaced `exec.cmd` command to
run system binaries for us. Using the system `dig +short` command gives us
Google's IP addresses (these rotate, and `google.com` often resolves to a single
A record). But this line-based format is archaic, so let's turn it into an array:

```hashpipe
#| split '\n'
[ '142.251.34.206', '' ]
```

That's a bit easier on the eyes. The trailing `''` is just the empty piece after
`dig`'s final newline. Note that the last command's output is always used as the
next command's input, so there is no need to retype the `dig` command to `split`
its lines.

Now let's grab the first IP result and save it:

```hashpipe
#| $ip = @ 0
'142.251.34.206'
```

Again using the last command's output, we use an `@`-expression to get the first
IP from the array and save it as `$ip`.

So we have an IP address, but weather tends to be based on physical location.
Luckily ip-api.com has a handy JSON API for geolocating IP addresses. Let's try
that.

```hashpipe
#| use http
#| $where = http.get http://ip-api.com/json/$ip
{
  status: 'success',
  country: 'United States',
  countryCode: 'US',
  region: 'CA',
  regionName: 'California',
  city: 'Mountain View',
  zip: '94043',
  lat: 37.4225,
  lon: -122.085,
  timezone: 'America/Los_Angeles',
  isp: 'Google LLC',
  org: 'Google LLC',
  as: 'AS15169 Google LLC',
  query: '142.251.34.206'
}
```

Perfect, a full location including coordinates. The result is now stored as
`$where`, so we can reuse its `lat` and `lon` fields.

From here we need a JSON weather API that takes latitude and longitude.
Open-Meteo does that without an API key:

```hashpipe
#| $weather = http.get https://api.open-meteo.com/v1/forecast {
  latitude: $where @ lat,
  longitude: $where @ lon,
  current: "temperature_2m,relative_humidity_2m,wind_speed_10m",
  temperature_unit: "fahrenheit",
  wind_speed_unit: "mph",
  timezone: "auto"
}
{
  latitude: 37.4162,
  longitude: -122.0803,
  generationtime_ms: 0.07128715515136719,
  utc_offset_seconds: -25200,
  timezone: 'America/Los_Angeles',
  timezone_abbreviation: 'GMT-7',
  elevation: 4,
  current_units: {
    time: 'iso8601',
    interval: 'seconds',
    temperature_2m: '°F',
    relative_humidity_2m: '%',
    wind_speed_10m: 'mp/h'
  },
  current: {
    time: '2026-06-21T00:45',
    interval: 900,
    temperature_2m: 57.1,
    relative_humidity_2m: 84,
    wind_speed_10m: 3.1
  }
}
```

Notice the second argument to the `http.get` command is an object, which will be
turned into a query string and added to the URL. This particular query object is
built with `@`-expressions pulling the coordinates from the geolocation result.

The raw response has more fields than we need. Use an object-shaped
at-expression to pick and rename values:

```hashpipe
#| $weather @ {
  time: current.time,
  temp_f: current.temperature_2m,
  humidity_pct: current.relative_humidity_2m,
  wind_mph: current.wind_speed_10m
}
{
  time: '2026-06-21T00:45',
  temp_f: 57.1,
  humidity_pct: 84,
  wind_mph: 3.1
}
```

You can also include unit labels from the same response:

```hashpipe
#| $weather @ {
  temp: current.temperature_2m,
  temp_unit: current_units.temperature_2m,
  wind: current.wind_speed_10m,
  wind_unit: current_units.wind_speed_10m
}
{ temp: 57.1, temp_unit: '°F', wind: 3.1, wind_unit: 'mp/h' }
```

That makes more sense than a raw API payload. And it appears that it is a mild
night in Mountain View, so maybe the lag was due to something else.

---

The full pipeline:

```hashpipe
#| use exec http
#| $ip = exec.cmd "dig +short google.com" | split '\n' @ 0
#| $where = http.get http://ip-api.com/json/$ip
#| http.get https://api.open-meteo.com/v1/forecast {
  latitude: $where @ lat,
  longitude: $where @ lon,
  current: "temperature_2m,relative_humidity_2m,wind_speed_10m",
  temperature_unit: "fahrenheit",
  wind_speed_unit: "mph",
  timezone: "auto"
} @ {
  city: $where.city,
  time: current.time,
  temp_f: current.temperature_2m,
  humidity_pct: current.relative_humidity_2m,
  wind_mph: current.wind_speed_10m
}
{
  city: 'Mountain View',
  time: '2026-06-21T00:45',
  temp_f: 57.1,
  humidity_pct: 84,
  wind_mph: 3.1
}
```

As a reusable command:

```hashpipe
#| def server-weather { $host |
  $ip = exec.cmd "dig +short $host" | split '\n' @ 0
  $where = http.get http://ip-api.com/json/$ip
  http.get https://api.open-meteo.com/v1/forecast {
    latitude: $where @ lat,
    longitude: $where @ lon,
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto"
  } @ {
    host: $host,
    city: $where.city,
    temp_f: current.temperature_2m,
    humidity_pct: current.relative_humidity_2m,
    wind_mph: current.wind_speed_10m
  }
}

#| server-weather google.com
{
  host: 'google.com',
  city: 'Mountain View',
  temp_f: 57.1,
  humidity_pct: 84,
  wind_mph: 3.1
}

#| server-weather news.ycombinator.com
{
  host: 'news.ycombinator.com',
  city: 'San Diego',
  temp_f: 62.3,
  humidity_pct: 80,
  wind_mph: 5.2
}
```
