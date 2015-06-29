polar = require 'polar'

app = polar.setup_app
    port: 6126

app.get '/', (req, res) -> res.render 'index' 

app.start()
