
import { MovexDefinition } from 'movex';
import { reducer as chatReducer } from './modules/chat/movex';
import { reducer as rpsReducer } from './modules/rps/movex';

// The idea of this is so both the server and the client can read it
// Obviosuly being a node/js env helps a lot :)

const config: MovexDefinition = {
  resources: {
    chat: chatReducer,
    rps: rpsReducer,
  },
};

export default config;
