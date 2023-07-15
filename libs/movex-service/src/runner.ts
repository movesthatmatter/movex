const definition = require('./dist');
const movexServer = require('movex-server');

movexServer.movexServer({}, definition.default);
