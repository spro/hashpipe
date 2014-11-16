hyperquest = require 'hyperquest'
somata = require 'somata'

fetch_worker = new somata.Service 'fetcher',

    fetch: (url, cb) ->
        req = hyperquest url, {headers: {'user-agent': 'fetcher'}}

        req.on 'response', (res) ->
            data_string = ''

            res.on 'data', (_data) ->
                data_string += _data

            res.on 'end', ->
                try
                    data = JSON.parse data_string
                    cb null, data
                catch e
                    somata.log.e "ERROR:", e
                    cb null, []

            res.on 'error', ->
                somata.log.e "ERROR:", e
                cb null, []

