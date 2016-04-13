var _ = require('lodash')
var crypto = require('crypto')
var request = require('request')
var redis = require('redis')
// var map = require('async').map

function ClientManager (opts) {
  _.assign(this, {
    clients: [],
    oauthUrl: 'http://0.0.0.0:8084/client',
    redisUrl: 'redis://0.0.0.0:6379',
    redisPrefix: '__anotation_api_',
    // only make requests to external sites every 15 seconds.
    ttl: 15
  }, opts)

  this.client = redis.createClient(this.redisUrl)
}

ClientManager.prototype.load = function (loaded) {
  var _this = this
  request.get({
    url: this.oauthUrl,
    json: true
  }, function (err, res, body) {
    if (res.statusCode !== 200) {
      err = Error('unexpected status code = ' + res.statusCode)
    }
    if (err) {
      return loaded(err)
    } else {
      _this.clients.push.apply(_this.clients, body)
      return loaded()
    }
  })
}

// dispatch a signed package event to the external clients.
// {
//  "event": "package:page-load",
//  "package": "left-pad",
//  "sender": {
//    "email": "ben@example.com"
//  }
// }
ClientManager.prototype.annotationsForPageLoad = function (pkgName, cb) {
  this.client.lrange(this.key(pkgName), 0, 9999, function (err, annotations) {
    if (err) {
      console.error(err.message)
    }
    if (annotations) {
      return cb(annotations.map(function (annotation) {
        return JSON.parse(annotation)
      }))
    } else {

    }
  })
}

/*
Cache a set of annotations, so we don't hammer
the external API:

[{
  id: 'abc-123-abc',
  status: 'green',
  'status-message': 'module scanned',
  description: 'my awesome integration',
  'external-link': 'http://example.com/foo-package/audit',
  'external-link-text': 'view details'
}]
*/
ClientManager.prototype.cacheAnnotations = function (pkgName, annotations, cb) {
  // toss a fingerprint on our annotation so that the
  // frontend can dedupe, and turn it into a string for Redis.
  annotations = annotations.map(function (annotation) {
    annotation.fingerprint = hash(JSON.stringify(annotation), '')
    return JSON.stringify(annotation)
  })
  this.client.lpush(this.key(pkgName), annotations, function (err) {
    if (err) console.error(err.message)
  })
  this.client.expire(this.key(pkgName), this.ttl, function (err) {
    if (err) console.error(err.message)
    return cb()
  })
}

ClientManager.prototype.sign = function (payload, client) {
  var secret = client.tokens[0].access_token
  return 'sha256=' + hash(payload, secret)
}

ClientManager.prototype.key = function (pkgName) {
  return this.redisPrefix + pkgName
}

function hash (payload, secret) {
  return crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

module.exports = ClientManager
