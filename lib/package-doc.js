var assign = require('lodash').assign
var request = require('request')
var resolve = require('url').resolve

function PackageDoc (opts) {
  assign(this, {
    registry: process.env.FRONT_DOOR_HOST,
    secret: process.env.SHARED_FETCH_SECRET
  }, opts)
}

PackageDoc.prototype.get = function (pkgName, cb) {
  pkgName = pkgName.replace('/', '%2f')

  if (!this.registry) return cb(Error('no registry configured'))

  request.get({
    url: resolve(this.registry, pkgName),
    json: true,
    qs: {
      sharedFetchSecret: this.secret
    }
  }, function (err, res, obj) {
    if (res && res.statusCode >= 400) {
      err = Error('unexpected status = ' + res.statusCode)
      err.code = res.statusCode
    }
    if (err) {
      return cb(err)
    }

    // only return latest version.
    var latest
    if (obj['dist-tags'] && obj['dist-tags'].latest && obj.versions) {
      latest = obj.versions[obj['dist-tags'].latest]
    }

    return cb(null, latest)
  })
}

module.exports = function (opts) {
  return new PackageDoc(opts)
}
