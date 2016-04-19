var api = require('../')

exports.builder = function (yargs) {
  return yargs
    .option('port', {
      alias: 'p',
      type: 'number',
      default: 8085,
      describe: 'port to listen on'
    })
    .option('host', {
      alias: 't',
      default: '0.0.0.0',
      describe: 'host to bind to'
    })
    .option('oauth-url', {
      alias: 'o',
      describe: 'url of oauth micro-service to pull clients from',
      default: 'http://0.0.0.0:8084/client'
    })
    .option('redis-url', {
      alias: 'r',
      descirbe: 'url of redis server to store annotations in',
      default: 'redis://0.0.0.0:6379'
    })
}

exports.handler = function (argv) {
  api(argv, function () {})
}
