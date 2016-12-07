// Generated by CoffeeScript 1.8.0
(function() {
  var jquery, jsdom;

  jsdom = require('jsdom');

  jquery = require('jquery');

  exports.youtube_links = function(inp, args, ctx, cb) {
    return jsdom.env(inp, function(err, window) {
      var $, links;
      $ = jquery(window);
      links = [];
      $('a').each(function() {
        var _ref;
        if ((_ref = $(this).attr('href')) != null ? _ref.match(/^\/watch/) : void 0) {
          return links.push({
            title: $(this).attr('title'),
            href: $(this).attr('href')
          });
        }
      });
      return cb(null, links);
    });
  };

  exports.youtube_views = function(inp, args, ctx, cb) {
    return jsdom.env(inp, function(err, window) {
      var $, text;
      $ = jquery(window);
      text = $('.watch-view-count').text();
      return cb(null, Number(text.replace(/\D/g, '')));
    });
  };

}).call(this);