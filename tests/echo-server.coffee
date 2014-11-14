polar = require 'polar'

app = polar.setup_app port: 8042

echoRequest = (req, res) ->
    res.setHeader 'Access-Control-Allow-Origin', '*'
    res.json
        url: req.url
        body: req.body
        numbers: [Math.random(), Math.random(), Math.random(), Math.random()]
        success: true

app.get '/*', echoRequest
app.post '/*', echoRequest
app.put '/*', echoRequest
app.delete '/*', echoRequest

app.start()
