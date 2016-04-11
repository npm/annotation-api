#!/usr/bin/env node

require('yargs')
  .usage('$0 <cmd>')
  .command('start', 'start annotation server', require('../lib/start'))
  .help()
  .alias('help', 'h')
  .epilog('deliver annotations from external services to the npm Enterprise front-end')
  .demand(1, 'you must provide a command to run')
  .argv
