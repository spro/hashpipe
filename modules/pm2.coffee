pm2 = require 'pm2'
{wrapall} = require 'hashpipe/helpers'

pm2.connect()

module.exports = wrapall pm2, 'pm2.'

