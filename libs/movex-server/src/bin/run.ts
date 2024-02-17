#!/usr/bin/env node
/* eslint @typescript-eslint/no-var-requires: 0 */
const definition = require('./dist');
const movexServer = require('movex-server');

movexServer.movexServer({}, definition.default);
