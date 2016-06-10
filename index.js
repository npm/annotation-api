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

  function packageHandler (req, res, next, pkgName) {
    clientManager.annotationsForPageLoad(pkgName, function (annotations) {
      res.send(annotations)
      return next()
    })
  }

  server.get('/api/v1/annotations/:pkg', function (req, res, next) {
    packageHandler(req, res, next, req.params.pkg)
  })

  server.get('/api/v1/annotations/:scope/:pkg', function (req, res, next) {
    packageHandler(req, res, next, req.params.scope + '/' + req.params.pkg)
  })

  // start listening on port.
  server.listen(opts.port, opts.host, function () {
    cb(null, server)
    console.info(server.name + ' listening at ' + server.url)
  })

  clientManager.start(function () {
    console.info('loaded addon clients')
  })
}
