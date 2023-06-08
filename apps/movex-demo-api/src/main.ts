import { movexServer } from 'movex-server';

// This needs to be imported manually like this, kinda similar to how it will be loaded 
//  when the seamless server will be running. Since one issue that happens is that movex-examples
//  exports jsx from index since it's literally meant only for the client. The server is a hack, 
//  incidentally being able to read it too :D
import movexConfig from 'libs/movex-examples/src/movex.config';

movexServer({}, movexConfig);
