/* global describe, it, before, after */

var server = null
var annotationApi = require('../')
var request = require('request')

require('chai').should()
global.console.info = function () {}
global.console.error = function () {}

describe('annotation-api', function () {
  before(function (done) {
    annotationApi({
      port: 9999
    }, function (_err, _server) {
      server = _server
      return done()
    })
  })

  it('returns content', function (done) {
    request.get({
      url: 'http://0.0.0.0:9999/ping',
      json: true
    }, function (req, res, body) {
      body.response.should.equal('pong')
      return done()
    })
  })

  it('supports unscoped package', function (done) {
    request.get({
      url: 'http://0.0.0.0:9999/api/v1/annotations/lodash',
      json: true
    }, function (req, res, body) {
      res.statusCode.should.equal(200)
      body.should.be.an('array').and.be.empty
      return done()
    })
  })

  it('supports scoped package', function (done) {
    request.get({
      url: 'http://0.0.0.0:9999/api/v1/annotations/@angular/core',
      json: true
    }, function (req, res, body) {
      res.statusCode.should.equal(200)
      body.should.be.an('array').and.be.empty
      return done()
    })
  })

  after(function (done) {
    server.close(function () {
      return done()
    })
  })
})
