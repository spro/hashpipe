somata_socketio = require 'somata-socketio'
fs = require 'fs'

app = somata_socketio.setup_app
    port: 1111

app.get '/', (req, res) ->
    res.render 'index'

app.get '/grammar.peg', (req, res) ->
    fs.createReadStream('../grammar.peg').pipe(res)

app.start()

