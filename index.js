var restify = require('restify')

module.exports = function (opts, cb) {
  var server = restify.createServer({ name: 'annotation-api' })

  server.use(restify.bodyParser())
  server.use(restify.queryParser())

  server.get('/ping', function (req, res, next) {
    res.send({response: 'pong'})
    return next()
  })

  // start listening on port.
  server.listen(opts.port, opts.host, function () {
    cb(null, server)
    console.info(server.name + ' listening at ' + server.url)
  })
}
