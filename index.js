#!/usr/bin/env node
'use strict';
let planetExpressLoader = require('./src/app.js').app;
let program = require('commander');

program
    .arguments('<file>')
    .option('-u, --username <username>', 'The user to authenticate as')
    .option('-p, --password <password>', 'The user\'s password')
    .action(function(file, args) {
        planetExpressLoader(args.username, args.password, file);
    })
  .parse(process.argv);
