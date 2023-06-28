const definition = require('./dist');
// TODO: this is written like this to avoid nx failing with a circular dependency
// which anyway has nothing to do with the runner
const movexServer = require('movex' + '-' + 'server');

movexServer.movexServer({}, definition.default);
