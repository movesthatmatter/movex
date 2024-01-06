import { reducer as chatReducer } from './modules/chat/movex';
import { reducer as rpsReducer } from './modules/rps/movex';
import counterReducer from './modules/counter/reducer';

// The idea of this is so both the server and the client can read it
// Obviosuly being a node/js env helps a lot :)

const config = {
  resources: {
    chat: chatReducer,
    rps: rpsReducer,
    counter: counterReducer,
  },
};

export default config;
