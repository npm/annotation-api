var restify = require('restify')
var ClientManager = require('./lib/client-manager')

module.exports = function (opts, cb) {
  var server = restify.createServer({ name: 'annotation-api' })
  var clientManager = new ClientManager(opts)

  server.use(restify.bodyParser())
  server.use(restify.queryParser())

  server.get('/ping', function (req, res, next) {
    res.send({response: 'pong'})
    return next()
  })

  server.get('/api/v1/annotations/:pkg', function (req, res, next) {
    clientManager.annotationsForPageLoad(req.params.pkg, function (annotations) {
      res.send(annotations)
      return next()
    })
  })

  // start listening on port.
  server.listen(opts.port, opts.host, function () {
    cb(null, server)
    console.info(server.name + ' listening at ' + server.url)
  })

  clientManager.load(function (err) {
    if (err) console.error(err.message)
    else console.info('loaded addon clients')
  })
}
