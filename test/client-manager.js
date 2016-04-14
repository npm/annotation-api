/* global describe, it, beforeEach */

var ClientManager = require('../lib/client-manager')
var client = require('redis').createClient()
var crypto = require('crypto')
var expect = require('chai').expect
var fs = require('fs')
var nock = require('nock')

require('chai').should()

global.console.info = function () {}

describe('ClientManager', function () {
  describe('load', function () {
    it('loads a list of clients from the OAuth 2.0 micro-service', function (done) {
      var clients = nock('http://0.0.0.0:8084')
        .get('/client')
        .reply(200, fs.readFileSync('./test/fixtures/clients.json', 'utf-8'))

      var clientManager = new ClientManager()
      clientManager.load(function (err) {
        expect(err).to.equal(undefined)
        clientManager.clients.length.should.equal(2)
        clients.done()
        return done()
      })
    })
  })

  describe('sign', function () {
    var clients = JSON.parse(fs.readFileSync('./test/fixtures/clients.json', 'utf-8'))

    it('returns an appropriate signature given a payload and client', function () {
      var clientManager = new ClientManager()
      var signature = clientManager.sign('{"json": "awesome"}', clients[0])
      var expected = 'sha256=' + crypto.createHmac('sha256', '0f5aab83-7a62-4129-b407-e4837b52c111')
        .update('{"json": "awesome"}')
        .digest('hex')
      signature.should.equal(expected)
    })
  })

  describe('annotationForPageLoad', function () {
    var annotation = {
      id: 'abc-123-abc',
      status: 'green',
      'status-message': 'module scanned',
      description: 'my awesome integration',
      'external-link': 'http://example.com/foo-package/audit',
      'external-link-text': 'view details'
    }
    var clients = JSON.parse(fs.readFileSync('./test/fixtures/clients.json', 'utf-8'))

    beforeEach(function () {
      delete annotation.fingerprint
      client.flushdb()
    })

    it('returns annotation from cache it is populated', function (done) {
      var clientManager = new ClientManager()
      var pkgName = 'foo-pkg'

      clientManager.cacheAnnotations(pkgName, [annotation], function () {
        clientManager.annotationsForPageLoad(pkgName, function (annotations) {
          var annotation = annotations[0]
          annotation.id.should.equal('abc-123-abc')
          annotation.fingerprint.should.match(/[a-z0-9]{64}/)
          return done()
        })
      })
    })

    it('requests annotations from an external API if cache is not populated', function (done) {
      var pkgName = 'foo-pkg'
      var payload = JSON.stringify({
        event: 'package:page-load',
        package: pkgName,
        sender: {
          email: clients[0].tokens[0].user_email
        }
      })
      var clientManager = new ClientManager()
      var signature = clientManager.sign(payload, clients[0])
      var getClients = nock('http://0.0.0.0:8084')
        .get('/client')
        .reply(200, [clients[0]])
      // mock requesting a payload from an external
      // service. the webhook endpoint is stored on
      // the OAuth client.
      var getAnnotation = nock('http://www.example.com', {
        reqheaders: {
          'npm-signature': signature,
          'content-type': 'application/json'
        }
      })
        .post('/fetch/data', payload)
        .reply(200, annotation)

      clientManager.load(function (err) {
        expect(err).to.equal(undefined)
        clientManager.annotationsForPageLoad(pkgName, function (annotations) {
          expect(err).to.equal(undefined)

          var annotation = annotations[0]
          // the client-id gets written to the
          // annotation as a unique identifier.
          annotation.id.should.equal(clients[0].client_id)
          annotation.fingerprint.should.match(/[a-z0-9]{64}/)

          getClients.done()
          getAnnotation.done()
          return done()
        })
      })
    })
  })
})
