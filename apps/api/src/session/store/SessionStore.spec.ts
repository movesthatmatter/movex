import { Store, createMockStore } from 'relational-redis-store';
import { AsyncResult } from 'ts-async-results';
import { Ok } from 'ts-results';
import { SessionStore } from './SessionStore';
import MockDate from 'mockdate';

let mockUUIDCount = 0;
const get_MOCKED_UUID = (count: number) => `MOCK-UUID-${count}`;
jest.mock('uuid', () => ({ v4: () => get_MOCKED_UUID(++mockUUIDCount) }));

describe('AppService', () => {
  let store: Store<any>;
  let session: SessionStore;

  let oldConsoleLog = console.log;
  let oldConsoleInfo = console.info;

  const NOW_TIMESTAMP = new Date().getTime();

  beforeAll(async () => {
    // Logs
    const noop = () => {};
    console.log = noop;
    console.info = noop;

    // Date
    MockDate.set(NOW_TIMESTAMP);

    // Store
    store = createMockStore();
    session = new SessionStore(store);
  });

  afterAll(() => {
    // Logs
    console.log = oldConsoleLog;
    console.info = oldConsoleInfo;

    // Date
    MockDate.reset();
    // global.Date.now = realDateFn;
  });

  beforeEach(() => {
    mockUUIDCount = 0;

    store.flush();
  });

  describe('peer', () => {
    describe('creation', () => {
      it('creates a peer without input', async () => {
        const actual = await session.createClient().resolve();
        const expected = new Ok({
          index: 1,
          length: 1,
          item: {
            id: get_MOCKED_UUID(1),
            subscriptions: {},
          },
        });

        // console.debug(session.)

        expect(actual).toEqual(expected);
      });

      it('creates a peer with given ID', async () => {
        const actual = await session.createClient({ id: 'test-id' }).resolve();
        const expected = new Ok({
          index: 1,
          length: 1,
          item: {
            id: 'test-id',
            subscriptions: {},
          },
        });

        expect(actual).toEqual(expected);
      });

      it('creates a peer with given Info', async () => {
        const info = {
          name: 'Jim',
          age: 23,
        };
        const actual = await session
          .createClient({
            info,
          })
          .resolve();

        const expected = new Ok({
          index: 1,
          length: 1,
          item: {
            id: get_MOCKED_UUID(1),
            subscriptions: {},
            info,
          },
        });

        expect(actual).toEqual(expected);
      });
    });

    describe('get', () => {
      it('gets a peer by the returned PeerId', async () => {
        const createdPeers = [
          await session.createClient().resolve(),
          await session.createClient().resolve(),
          await session.createClient().resolve(),
        ];

        expect(createdPeers.map((r) => r.ok)).toEqual(
          createdPeers.map(() => true)
        );

        const [createdPeerAResult, createdPeerBResult, createdPeerCResult] =
          createdPeers;

        if (
          !(
            createdPeerAResult.ok &&
            createdPeerBResult.ok &&
            createdPeerCResult.ok
          )
        ) {
          return;
        }

        const actual = await session
          .getClient(createdPeerBResult.val.item.id)
          .resolve();

        const expected = new Ok({
          id: get_MOCKED_UUID(2),
          subscriptions: {},
        });

        expect(actual).toEqual(expected);
      });

      it('gets a peer by the given PeerId', async () => {
        const createdPeers = [
          await session.createClient({ id: 'test-id' }).resolve(),
          await session.createClient().resolve(),
          await session.createClient().resolve(),
        ];

        expect(createdPeers.map((r) => r.ok)).toEqual(
          createdPeers.map(() => true)
        );

        const [createdPeerAResult, createdPeerBResult, createdPeerCResult] =
          createdPeers;

        if (
          !(
            createdPeerAResult.ok &&
            createdPeerBResult.ok &&
            createdPeerCResult.ok
          )
        ) {
          return;
        }

        const actual = await session.getClient('test-id').resolve();

        const expected = new Ok({
          id: 'test-id',
          subscriptions: {},
        });

        expect(actual).toEqual(expected);
      });

      it('gets all peers', async () => {
        await session.createClient({ id: 'test-id' }).resolve();
        await session.createClient().resolve();
        await session.createClient().resolve();

        const actual = await session.getAllClients().resolve();
        const expected = new Ok([
          {
            id: 'test-id',
            subscriptions: {},
          },
          {
            id: get_MOCKED_UUID(1),
            subscriptions: {},
          },
          {
            id: get_MOCKED_UUID(2),
            subscriptions: {},
          },
        ]);

        expect(actual).toEqual(expected);
      });
    });

    describe('removal', () => {
      it('removes a peer by returned id after it got created', async () => {
        const createdPeerResult = await session.createClient().resolve();

        expect(createdPeerResult.ok).toBe(true);

        if (!createdPeerResult.ok) {
          return;
        }

        const actual = await session
          .removeClient(createdPeerResult.val.item.id)
          .resolve();

        const expected = new Ok({
          index: 1,
          length: 0,
          item: undefined,
        });

        expect(actual).toEqual(expected);
      });
    });
  });

  // describe('topic', () => {
  //   it('create a topic', async () => {
  //     const actual = await session.createTopic('topic-1').resolve();
  //     const expected = new Ok({
  //       index: 1,
  //       length: 1,
  //       item: {
  //         id: 'topic-1',
  //         subscribers: {},
  //       },
  //     });

  //     expect(actual).toEqual(expected);
  //   });

  //   it('gets a topic by name(id)', async () => {
  //     await session.createTopic('topic-2').resolve();
  //     await session.createTopic('topic-1').resolve();

  //     const actual = await session.getTopic('topic-2').resolve();

  //     const expected = new Ok({
  //       id: 'topic-2',
  //       subscribers: {},
  //     });

  //     expect(actual).toEqual(expected);
  //   });
  // });

  describe('resources', () => {
    test('creates a resource', async () => {
      const actual = await session
        .createResource('room', {
          type: 'play',
        })
        .resolve();

      const expected = new Ok({
        index: 1,
        length: 1,
        item: {
          id: get_MOCKED_UUID(1),
          data: {
            type: 'play',
          },
          subscribers: {},
        },
      });

      expect(actual).toEqual(expected);

      // const actual = await session.getResource
    });
  });

  describe('subscriptions', () => {
    it('subscribes to a resource', async () => {
      let clientId = 'TBD';
      let resourceId = 'TBD';

      const actual = await AsyncResult.all(
        session.createClient(),
        session.createResource('room', {
          type: 'play',
        })
      )
        .flatMap(([{ item: client }, { item: resource }]) => {
          // This is just for testing
          clientId = client.id;
          resourceId = resource.id;

          return session.subscribeToResource({
            clientId: client.id,
            resourceType: 'room',
            resourceId: resource.id,
          });
        })
        .resolve();

      const expected = new Ok({
        client: {
          id: clientId,
          subscriptions: {
            [resourceId]: {
              subscribedAt: NOW_TIMESTAMP,
            },
          },
        },
        resource: {
          id: resourceId,
          data: {
            type: 'play',
          },
          subscribers: {
            [clientId]: {
              subscribedAt: NOW_TIMESTAMP,
            },
          },
        },
      });

      expect(actual).toEqual(expected);
    });

    // TODO Add test for when the client doesn't exist the resource should revert!

    //   it('get all subscribers from a topic', async () => {
    //     await AsyncResult.all(
    //       session.createClient({ id: '1st' }),
    //       session.createClient({ id: '2nd' }),
    //       session.createClient({ id: '3rd' }),
    //       session.createTopic('topic-1')
    //     ).resolve();
    //     await session.subscribeToTopic('topic-1', '2nd').resolve();
    //     await session.subscribeToTopic('topic-1', '1st').resolve();
    //     const actual = await session.getTopicSubscribers('topic-1').resolve();
    //     const expected = new Ok([
    //       {
    //         id: '2nd',
    //         subscriptions: {
    //           'topic-1': null,
    //         },
    //       },
    //       {
    //         id: '1st',
    //         subscriptions: {
    //           'topic-1': null,
    //         },
    //       },
    //     ]);
    //     expect(actual).toEqual(expected);
    //   });
    //   it('get all peer subscriptions', async () => {
    //     await AsyncResult.all(
    //       session.createClient({ id: '1st' }),
    //       session.createClient({ id: '2nd' }),
    //       session.createTopic('topic-1'),
    //       session.createTopic('topic-2'),
    //       session.createTopic('topic-3')
    //     ).resolve();
    //     await session.subscribeToTopic('topic-1', '1st').resolve();
    //     await session.subscribeToTopic('topic-2', '1st').resolve();
    //     await session.subscribeToTopic('topic-2', '2nd').resolve();
    //     const actual = await session.getClientSubscriptions('1st').resolve();
    //     const expected = new Ok([
    //       {
    //         id: 'topic-1',
    //         subscribers: {
    //           '1st': null,
    //         },
    //       },
    //       {
    //         id: 'topic-2',
    //         subscribers: {
    //           '1st': null,
    //           '2nd': null,
    //         },
    //       },
    //     ]);
    //     expect(actual).toEqual(expected);
    //   });

    it('ubsubscribe', async () => {
      await AsyncResult.all(
        session.createClient({ id: '1st' }),
        session.createClient({ id: '2nd' }),
        session.createResource('room', {
          type: 'play',
        })
      ).resolve();

      await session
        .subscribeToResource({
          resourceId: get_MOCKED_UUID(1),
          resourceType: 'room',
          clientId: '1st',
        })
        .resolve();

      await session
        .subscribeToResource({
          resourceId: get_MOCKED_UUID(1),
          resourceType: 'room',
          clientId: '2nd',
        })
        .resolve();

      const resourceId = get_MOCKED_UUID(1);

      const actual = await session
        .unsubscribeFromResource({
          resourceType: 'room',
          resourceId: resourceId,
          clientId: '1st',
        })
        .resolve();

      const expected = new Ok({
        client: {
          id: '1st',
          subscriptions: {},
        },
        resource: {
          id: resourceId,
          data: {
            type: 'play',
          },
          subscribers: {
            '2nd': {
              subscribedAt: NOW_TIMESTAMP,
            },
          },
        },
      });

      expect(actual).toEqual(expected);
    });
  });
});
