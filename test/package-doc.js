/* global describe, it */
var nock = require('nock')

require('chai').should()

describe('PackageDoc', function () {
  describe('get', function () {
    it('returns JSON for scoped package', function (done) {
      var pkgName = '@ben/foo'
      var registry = 'http://www.example.com'
      var secret = 'abc123'
      var PackageDoc = require('../lib/package-doc')({
        registry: registry,
        secret: secret
      })
      var getPackage = nock(registry)
        .get('/' + pkgName.replace('/', '%2f'))
        .query({
          sharedFetchSecret: secret
        })
        .reply(200, {
          'dist-tags': {latest: '1.0.0'},
          versions: {'1.0.0': {name: pkgName}}
        })
      PackageDoc.get(pkgName, function (err, doc) {
        if (err) return done(err)
        doc.name.should.equal(pkgName)
        getPackage.done()
        return done()
      })
    })

    it('gracefully handles an upstream error', function (done) {
      var pkgName = '@ben/foo'
      var registry = 'http://www.example.com'
      var secret = 'abc123'
      var PackageDoc = require('../lib/package-doc')({
        registry: registry,
        secret: secret
      })
      var getPackage = nock(registry)
        .get('/' + pkgName.replace('/', '%2f'))
        .query({
          sharedFetchSecret: secret
        })
        .reply(500)
      PackageDoc.get(pkgName, function (err, doc) {
        err.code.should.equal(500)
        getPackage.done()
        return done()
      })
    })
  })
})
