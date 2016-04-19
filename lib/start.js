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
      alias: 'o',
      default: '0.0.0.0',
      describe: 'host to bind to'
    })
    .option('oauth-url', {
      alias: 'o',
      describe: 'url of oauth micro-service to pull clients from',
      default: 'http://127.0.0.1:8084'
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
