polar = require 'polar'

app = polar.setup_app
    port: 6126

app.get '/', (req, res) -> res.render 'index'
app.get '/about.json', (req, res) -> res.json
    description: "A command line for working with web APIs"
    repo: 'http://github.com/spro/hashpipe'
    author: 'spro'
    wip: true

app.start()
