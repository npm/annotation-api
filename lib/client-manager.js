var _ = require('lodash')
var crypto = require('crypto')
var request = require('request')
var redis = require('redis')
var map = require('async').map

function ClientManager (opts) {
  _.assign(this, {
    clients: [],
    oauthUrl: 'http://0.0.0.0:8084/client',
    redisUrl: 'redis://0.0.0.0:6379',
    redisPrefix: '__anotation_api_',
    loadFrequency: 8000,
    loadInterval: null,
    // only make requests to external sites every 15 seconds.
    ttl: 15,
    // how long should we cache if request to upstream server failed?
    ttlFailure: 2,
    packageDoc: require('./package-doc')()
  }, opts)

  this.client = redis.createClient(this.redisUrl)
}

// loads clients from our OAuth micro-service.
// these clients each represent a single integration
// (as an example, Lift.)
ClientManager.prototype.load = function (loaded) {
  var _this = this
  request.get({
    url: this.oauthUrl,
    json: true,
    qs: {
      sharedFetchSecret: process.env.SHARED_FETCH_SECRET
    }
  }, function (err, res, body) {
    if (res && res.statusCode !== 200) {
      err = Error('unexpected status code = ' + res.statusCode)
    }
    if (err) {
      return loaded(err)
    } else {
      _this.clients = body
      return loaded()
    }
  })
}

// reload clients on an interval, this solves
// two problems:
// 1. handles annotation-api booting before oauth service.
// 2. handles new clients being added.
ClientManager.prototype.start = function (cb) {
  var _this = this
  this.loadInterval = setInterval(function () {
    _this.load(function (err) {
      if (err) console.error(err.message)
      // invoke the cb provided the
      // first time that we load clients.
      if (cb) {
        cb()
        cb = null
      }
    })
  }, this.loadFrequency)
}

ClientManager.prototype.stop = function () {
  if (this.loadInterval) clearInterval(this.loadInterval)
}

// fetch annotations from external services, returning
// from cache if possible:
// {
//  "event": "package:page-load",
//  "package": "left-pad",
//  "sender": {
//    "email": "ben@example.com"
//  }
// }
ClientManager.prototype.annotationsForPageLoad = function (pkgName, cb) {
  var _this = this
  _this.client.get('lock_' + this.key(pkgName), function (err, lock) {
    var repopulateCache = !lock

    if (err) console.error(err.message)
    _this.client.lrange(_this.key(pkgName), 0, 9999, function (err, annotations) {
      if (err) console.error(err.message)
      annotations = annotations || []

      // we always return from cache, but repopulate
      // it periodically.
      cb(annotations.map(function (annotation) {
        return JSON.parse(annotation)
      }))

      // populate the cache in the background.
      if (repopulateCache) {
        _this.fetchAnnotations(pkgName, function (annotations) {
          _this.cacheAnnotations(pkgName, annotations, function () {
            console.info('populated new annotations for', pkgName)
          })
        })
      }
    })
  })
}

// fetch annotations from all the external integrations.
ClientManager.prototype.fetchAnnotations = function (pkgName, cb) {
  var _this = this
  this.packageDoc.get(pkgName, function (err, doc) {
    if (err) console.error(err.message)
    map(_this.clients, function (client, done) {
      var payload = JSON.stringify({
        event: 'package:page-load',
        package: pkgName,
        packageDoc: doc,
        sender: {
          email: client.tokens[0].user_email
        }
      })
      var signature = _this.sign(payload, client)

      request.post({
        url: client.webhook,
        body: payload,
        timeout: 5000, // only wait 5s max for upstream response.
        headers: {
          'content-type': 'application/json',
          'npm-signature': signature
        }
      }, function (err, res, body) {
        if (res && res.statusCode >= 400) {
          err = Error('unexpected status code = ' + res.statusCode)
        }
        if (err) console.error(err.message)
        // return a blank annotation on errors.
        if (err) return done(null, null)
        if (body) {
          try {
            body = JSON.parse(body)
          } catch (err) {
            console.error(err.message)
            body = {}
          }
        }

        // the integration id is used to de-dupe.
        // the UI on the frontend.
        if (body) body.name = client.name
        body = body || {}
        body.id = client.client_id

        return done(null, body)
      })
    }, function (_err, annotations) {
      return cb(annotations.filter(function (item) {
        return !!item
      }))
    })
  })
}

/*
Cache a set of annotations, so we don't hammer
the external API.

Reminder that annotations look something like this:
[{
  id: 'abc-123-abc',
  fingerprint: 'a',
  rows: [{
    image: {
      url: 'http://www.example.com/img',
      text: 'image alt'
    },
    link: {
      url: 'http://www.example.com',
      text: 'my awesome link'
    },
    text: 'hello *world*!'
  }]
}]
*/
ClientManager.prototype.cacheAnnotations = function (pkgName, annotations, cb) {
  var failures = this.clients.length !== annotations.length
  if (!annotations.length) return cb()
  // toss a fingerprint on our annotation so that the
  // frontend can dedupe and turn it into a string for Redis.
  annotations = annotations.map(function (annotation) {
    annotation.fingerprint = hash(JSON.stringify(annotation), '')
    return JSON.stringify(annotation)
  })
  this.client.setex('lock_' + this.key(pkgName), failures ? this.ttlFailure : this.ttl, true)
  this.client.del(this.key(pkgName))
  this.client.lpush(this.key(pkgName), annotations, function (err) {
    if (err) console.error(err.message)
    return cb()
  })
}

function hash (payload, secret) {
  return crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

// helpers for signing the webhook payload.
ClientManager.prototype.sign = function (payload, client) {
  var secret = client.tokens[0].access_token
  return 'sha256=' + hash(payload, secret)
}
ClientManager.prototype.key = function (pkgName) {
  return this.redisPrefix + pkgName
}

module.exports = ClientManager
