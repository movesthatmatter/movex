import { SessionSDK } from './SessionSdk';
import { bootstrapServer } from '../server';
import { INestApplication } from '@nestjs/common';
import { SessionClient, SessionResource } from '../session/types';
import { WsResponseAsResult, WsResponseResultPayload } from './types';

// let mockUUIDCount = 0;
// const get_MOCKED_UUID = (count: number) => `MOCK-UUID-${count}`;
// jest.mock('uuid', () => ({ v4: () => get_MOCKED_UUID(++mockUUIDCount) }));

const delay = (ms = 500) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe('My Remote Server', () => {
  let server: INestApplication;
  let sdkA: SessionSDK;
  let sdkB: SessionSDK;
  let sdkC: SessionSDK;

  beforeEach((done) => {
    bootstrapServer().then((startedServer) => {
      server = startedServer;

      sdkA = new SessionSDK({
        url: 'ws://localhost:4444',
        apiKey: 'tester-A',
      });

      sdkB = new SessionSDK({
        url: 'ws://localhost:4444',
        apiKey: 'tester-B',
      });

      sdkC = new SessionSDK({
        url: 'ws://localhost:4444',
        apiKey: 'tester-C',
      });

      Promise.all([sdkA.connect(), sdkB.connect(), sdkC.connect()]).then(
        (socket) => {
          // console.log('connected', socket.id);
          done();
        }
      );

      // sdkB.connect();

      // ();
    });
  });

  afterEach((done) => {
    server.close().then(done);
    
    sdkA.disconnect();
    sdkB.disconnect();
    sdkC.disconnect();
  });

  it('sends a "createClient" Request and gets a Response back succesfully', async () => {
    let actualClient: SessionClient | undefined;
    sdkA.on('createClient', (client) => {
      actualClient = client;
    });

    sdkA.createClient();

    // TODO: This is only needed because we are still using
    //  the real redis not the mocked one!
    await delay(100);

    expect(actualClient).toEqual({
      id: actualClient?.id,
      subscriptions: {},
    });
  });

  it('sends a "createResource" Request and gets a Response back succesfully', async () => {
    let actualResource: SessionResource | undefined;
    sdkB.on('createResource', (resource) => {
      actualResource = resource;
    });

    sdkB.createResource();

    // TODO: This is only needed because we are still using
    //  the real redis not the mocked one!
    await delay(100);

    console.log('actualResource', actualResource);

    expect(actualResource).toEqual({
      id: actualResource?.id,
      data: {
        type: 'maha',
      },
      subscribers: {},
    });

    // sdk.on('')
  });

  //   afterEach(() => {
  //     request.closeAll(); // recommended when using remote servers
  //   });

  //   it('communicates via websockets', async () => {
  //     await request('https://example.com')
  //       .ws('/path/ws')
  //       .expectText('hello')
  //       .close();
  //   });
  // });

  // describe('ServerSDK', () => {
  //   let clientSocket: Socket;

  //   beforeAll((done) => {

  //   })

  //   test('works', async () => {
  //     // const sdk = new SessionSDK({
  //     //   url: 'http://localhost:3333/api',
  //     //   apiKey: '123-test',
  //     // });

  //     // sdk.createClient();

  //     // clientSocket = getSocketClient({
  //     //   url: 'ws://localhost:3333',
  //     //   query: {
  //     //     apiKey: 'tester', // This could change
  //     //   },
  //     // });

  //     clientSocket = io('ws://localhost:3333', {
  //       reconnectionDelay: 1000,
  //       reconnection: true,
  //       // transports: ['websocket'],
  //       agent: false,
  //       upgrade: true,
  //       rejectUnauthorized: false,
  //       query: {
  //         apiKey: 'maha-test',
  //       },
  //     })

  //     clientSocket.on("connect", () => {
  //       console.log('connected to socket');

  //       clientSocket.emit('message', 'helloo');
  //     });

  //     // clientSocket.on('message', (data) => {
  //     //   console.log('message received', data);

  //     // });

  //     // expect(1).toBe(2);
  //   });
});
