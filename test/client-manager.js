/* global describe, it, beforeEach */

var client = require('redis').createClient()
client.unref()

require('chai').should()
global.console.info = function () {}

describe('ClientManager', function () {
  beforeEach(function () {
    client.flushdb()
  })

  it('loads a list of clients from the OAuth 2.0 microservice', function (done) {
    client.set('foo', 'bar')
    client.get('foo', function (_err, res) {
      return done()
    })
  })
})
