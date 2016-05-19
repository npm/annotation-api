/* global describe, it */
var nock = require('nock')

require('chai').should()

describe('PackageDoc', function () {
  describe('get', function () {
    it('returns JSON for scoped package', function (done) {
      var pkgName = '@ben/foo'
      process.env.FRONT_DOOR_HOST = 'http://www.example.com'
      process.env.SHARED_FETCH_SECRET = 'abc123'
      var PackageDoc = require('../lib/package-doc')()
      var getPackage = nock(process.env.FRONT_DOOR_HOST)
        .get('/' + pkgName.replace('/', '%2f'))
        .query({
          sharedFetchSecret: process.env.SHARED_FETCH_SECRET
        })
        .reply(200, {name: pkgName})
      PackageDoc.get(pkgName, function (err, doc) {
        process.env.FRONT_DOOR_HOST = undefined
        process.env.SHARED_FETCH_SECRET = undefined
        if (err) return done(err)
        doc.name.should.equal(pkgName)
        getPackage.done()
        return done()
      })
    })

    it('gracefully handles an upstream error', function (done) {
      var pkgName = '@ben/foo'
      process.env.FRONT_DOOR_HOST = 'http://www.example.com'
      process.env.SHARED_FETCH_SECRET = 'abc123'
      var PackageDoc = require('../lib/package-doc')()
      var getPackage = nock(process.env.FRONT_DOOR_HOST)
        .get('/' + pkgName.replace('/', '%2f'))
        .query({
          sharedFetchSecret: process.env.SHARED_FETCH_SECRET
        })
        .reply(500)
      PackageDoc.get(pkgName, function (err, doc) {
        err.code.should.equal(500)
        process.env.FRONT_DOOR_HOST = undefined
        process.env.SHARED_FETCH_SECRET = undefined
        getPackage.done()
        return done()
      })
    })
  })
})
