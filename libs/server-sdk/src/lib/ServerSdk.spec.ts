import MockDate from 'mockdate';
import { ServerSDK } from './ServerSdk';
import { INestApplication } from '@nestjs/common';
import { SessionClient, SessionResource } from './types';

// TODO: Not sure about this as it's loading it from outside but it's ok for now!
import { bootstrapServer } from '../../../../apps/api/src/server';

// let mockUUIDCount = 0;
// const get_MOCKED_UUID = (count: number) => `MOCK-UUID-${count}`;
// jest.mock('uuid', () => ({ v4: () => get_MOCKED_UUID(++mockUUIDCount) }));

const delay = (ms = 500) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// describe('My Remote Server', () => {
let server: INestApplication;
let sdk: ServerSDK<
  {
    username: string;
    age: number;
  },
  {
    room: SessionResource<{
      type: 'play' | 'analysis' | 'meetup';
    }>;
    game: SessionResource<{
      type: 'maha' | 'chess';
    }>;
  }
>;

const NOW_TIMESTAMP = new Date().getTime();

beforeAll(() => {
  // Date
  MockDate.set(NOW_TIMESTAMP);
});

afterAll(() => {
  MockDate.reset();
});

beforeEach((done) => {
  bootstrapServer().then((startedServer) => {
    server = startedServer;

    sdk = new ServerSDK({
      url: 'ws://localhost:4444',
      apiKey: 'tester-A',
    });

    sdk.connect().then(() => done());
  });
});

afterEach((done) => {
  server.close().then(done);
  sdk.disconnect();
});

describe('Clients', () => {
  it('sends a "createClient" Request and gets a Response back succesfully', async () => {
    let actualClient: SessionClient | undefined;
    sdk.on('createClient', (client) => {
      actualClient = client;
    });

    sdk.createClient();

    // TODO: This is only needed because we are still using
    //  the real redis not the mocked one!
    await delay(100);

    expect(actualClient).toEqual({
      id: actualClient?.id,
      subscriptions: {},
    });
  });

  it('sends a "createClient" Request with given id and params and gets a Response back succesfully', async () => {
    let actualClient: SessionClient | undefined;
    sdk.on('createClient', (client) => {
      actualClient = client;
    });

    sdk.createClient({
      id: 'client-1',
      info: {
        username: 'tester',
        age: 23,
      },
    });

    // TODO: This is only needed because we are still using
    //  the real redis not the mocked one!
    await delay(100);

    expect(actualClient).toEqual({
      id: 'client-1',
      info: {
        username: 'tester',
        age: 23,
      },
      subscriptions: {},
    });
  });
});

describe('Resources', () => {
  it('sends a "createResource" Request and gets a Response back succesfully', async () => {
    let actualResource: SessionResource | undefined;
    sdk.on('createResource', (resource) => {
      actualResource = resource;
    });

    sdk.createResource('room', { type: 'play' });

    // TODO: This is only needed because we are still using
    //  the real redis not the mocked one!
    await delay(100);

    expect(actualResource).toEqual({
      $resource: 'room',
      id: actualResource?.id,
      data: {
        type: 'play',
      },
      subscribers: {},
    });
  });

  describe('Update', () => {
    let actualResource: SessionResource | undefined;

    beforeEach(async () => {
      sdk.on('createResource', (resource) => {
        actualResource = resource;
      });

      sdk.createResource('room', { type: 'play' });

      // TODO: This is only needed because we are still using
      //  the real redis not the mocked one!
      return delay(100);
    });

    it('Updates a Resource', async () => {
      expect(actualResource).toEqual({
        $resource: 'room',
        id: actualResource?.id,
        data: {
          type: 'play',
        },
        subscribers: {},
      });

      sdk.on('updateResource', (resource) => {
        actualResource = resource;
      });

      sdk.updateResource(
        {
          resourceId: actualResource!.id,
          resourceType: 'room',
        },
        {
          type: 'meetup',
        }
      );

      // TODO: This is only needed because we are still using
      //  the real redis not the mocked one!
      await delay(100);

      expect(actualResource).toEqual({
        $resource: 'room',
        id: actualResource?.id,
        data: {
          type: 'meetup',
        },
        subscribers: {},
      });
    });

    it('Updates a Resource with subscribers', async () => {
      expect(actualResource).toEqual({
        $resource: 'room',
        id: actualResource?.id,
        data: {
          type: 'play',
        },
        subscribers: {},
      });

      let actualClient: SessionClient | undefined;
      sdk.on('createClient', (client) => {
        actualClient = client;
      });
      sdk.createClient({
        id: 'user-1',
        info: { age: 23, username: 'tester-1' },
      });

      await delay(100);

      expect(actualResource).toBeDefined();
      expect(actualClient).toBeDefined();
      if (!(actualResource?.id && actualClient?.id)) {
        return;
      }

      sdk.subscribeToResource('user-1', {
        resourceId: actualResource.id,
        resourceType: 'room',
      });

      await delay(100);

      sdk.on('updateResource', (resource) => {
        actualResource = resource;
      });

      sdk.updateResource(
        {
          resourceId: actualResource!.id,
          resourceType: 'room',
        },
        {
          type: 'meetup',
        }
      );

      // TODO: This is only needed because we are still using
      //  the real redis not the mocked one!
      await delay(100);

      expect(actualResource).toEqual({
        $resource: 'room',
        id: actualResource?.id,
        data: {
          type: 'meetup',
        },
        subscribers: {
          'user-1': {
            subscribedAt: NOW_TIMESTAMP,
          },
        },
      });
    });
  });
});

describe('Subscriptions', () => {
  it('subscribes a $client to a resource', async () => {
    let actualResource: SessionResource | undefined;
    sdk.on('createResource', (resource) => {
      // TODO: here the $resource (type) needs
      //  to be in and it also needs to be a tagged union of resources based on the $resource field
      actualResource = resource;
    });

    let actualClient: SessionClient | undefined;
    sdk.on('createClient', (client) => {
      actualClient = client;
    });

    sdk.createClient({ id: 'user-1', info: { age: 23, username: 'tester-1' } });
    sdk.createResource('room', { type: 'play' });

    // TODO: This is only needed because we are still using
    //  the real redis not the mocked one!
    await delay(100);

    expect(actualResource).toBeDefined();
    expect(actualClient).toBeDefined();
    if (!(actualResource?.id && actualClient?.id)) {
      return;
    }

    const spy = jest.fn();

    sdk.on('subscribeToResource', spy);

    sdk.subscribeToResource('user-1', {
      resourceId: actualResource.id,
      resourceType: 'room',
    });

    await delay(100);

    expect(spy).toBeCalledWith({
      client: {
        id: 'user-1',
        info: {
          username: 'tester-1',
          age: 23,
        },
        subscriptions: {
          [`room:${actualResource.id}`]: {
            subscribedAt: NOW_TIMESTAMP,
          },
        },
      },
      resource: {
        $resource: 'room',
        id: actualResource.id,
        data: {
          type: 'play',
        },
        subscribers: {
          'user-1': {
            subscribedAt: NOW_TIMESTAMP,
          },
        },
      },
    });
  });
});
// });

// TODO: To add
// describe('multiple connections', () => {
//   let server: INestApplication;
//   let sdkA: SessionSDK;
//   let sdkB: SessionSDK;
//   let sdkC: SessionSDK;

//   beforeEach((done) => {
//     bootstrapServer().then((startedServer) => {
//       server = startedServer;

//       sdkA = new SessionSDK({
//         url: 'ws://localhost:4444',
//         apiKey: 'tester-A',
//       });

//       sdkB = new SessionSDK({
//         url: 'ws://localhost:4444',
//         apiKey: 'tester-B',
//       });

//       sdkC = new SessionSDK({
//         url: 'ws://localhost:4444',
//         apiKey: 'tester-C',
//       });

//       Promise.all([sdkA.connect(), sdkB.connect(), sdkC.connect()]).then(
//         (socket) => {
//           // console.log('connected', socket.id);
//           done();
//         }
//       );

//       // sdkB.connect();

//       // ();
//     });
//   });

//   afterEach((done) => {
//     server.close().then(done);

//     sdkA.disconnect();
//     sdkB.disconnect();
//     sdkC.disconnect();
//   });
// });
