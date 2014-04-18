# pipeline

A DSL for asynchronous command pipelines.

### *A taste of nectar*

input &rarr;

```
[ { name: 'joe', dogs: 
    [ { name: 'sparky', age: 58 }, { name: 'woofer', age: 6 } ] },
  { name: 'fred', dogs: [] } ]
```

&rarr; pipeline &rarr;

```
id @ :{ name, dog_years: $(@dogs:age | + 0) }
```

&rarr; output

```
[ { name: 'joe', dog_years: 64 },
  { name: 'fred', dog_years: 0 } ]
```