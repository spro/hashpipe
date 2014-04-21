jsdom = require 'jsdom'
jquery = require 'jquery'

# "html" -> youtube_links -> [{link}]
exports.youtube_links = (inp, args, ctx, cb) ->
    jsdom.env inp, (err, window) ->
        $ = jquery(window)
        links = []

        $('a').each ->

            if $(this).attr('href')?.match /^\/watch/
                links.push
                    title: $(this).attr('title')
                    href: $(this).attr('href')

        cb null, links

# "html" -> youtube_views -> #views
exports.youtube_views = (inp, args, ctx, cb) ->
    jsdom.env inp, (err, window) ->
        $ = jquery(window)
        text = $('.watch-view-count').text()
        cb null, Number text.replace(/\D/g, '')

