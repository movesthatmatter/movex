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
    });

    it('gets a resource', async () => {
      await session.createResource('game', { type: 'maha' }).resolve();
      await session.createResource('game', { type: 'maha' }).resolve();
      await session.createResource('room', { type: 'play' }).resolve();

      const actual = await session
        .getResource({ resourceType: 'game', resourceId: get_MOCKED_UUID(2) })
        .resolve();

      const expected = new Ok({
        id: get_MOCKED_UUID(2),
        data: {
          type: 'maha',
        },
        subscribers: {},
      });

      expect(actual).toEqual(expected);
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

          return session.subscribeToResource(client.id, {
            resourceType: 'room',
            resourceId: resource.id,
          });
        })
        .resolve();

      const expected = new Ok({
        client: {
          id: clientId,
          subscriptions: {
            [`room:${resourceId}`]: {
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

    it('gets all resource subscribers', async () => {
      await AsyncResult.all(
        session.createClient({ id: '1st' }),
        session.createClient({ id: '2nd' }),
        session.createClient({ id: '3rd' }),
        session.createResource('game', {
          type: 'maha',
        })
      ).resolve();

      const resourceId = get_MOCKED_UUID(1);

      await session
        .subscribeToResource('2nd', {
          resourceType: 'game',
          resourceId,
        })
        .resolve();

      await session
        .subscribeToResource('1st', {
          resourceType: 'game',
          resourceId,
        })
        .resolve();

      const actual = await session
        .getResourceSubscribers({
          resourceType: 'game',
          resourceId,
        })
        .resolve();

      const expected = new Ok([
        {
          id: '2nd',
          subscriptions: {
            [`game:${resourceId}`]: {
              subscribedAt: NOW_TIMESTAMP,
            },
          },
        },
        {
          id: '1st',
          subscriptions: {
            [`game:${resourceId}`]: {
              subscribedAt: NOW_TIMESTAMP,
            },
          },
        },
      ]);
      expect(actual).toEqual(expected);
    });

    it('gets all client subscriptions', async () => {
      await AsyncResult.all(
        session.createClient({ id: '1st' }),
        session.createClient({ id: '2nd' }),
        session.createResource('game', { type: 'maha' }), // id: get_MOCKED_UUID(1)
        session.createResource('room', { type: 'play' }), // id: get_MOCKED_UUID(2)
        session.createResource('room', { type: 'play' }) //  id: get_MOCKED_UUID(3)
      ).resolve();

      await session
        .subscribeToResource('1st', {
          resourceType: 'room',
          resourceId: get_MOCKED_UUID(2),
        })
        .resolve();

      await session
        .subscribeToResource('1st', {
          resourceType: 'game',
          resourceId: get_MOCKED_UUID(1),
        })
        .resolve();

      await session
        .subscribeToResource('2nd', {
          resourceType: 'room',
          resourceId: get_MOCKED_UUID(2),
        })
        .resolve();

      const actual = await session.getClientSubscriptions('1st').resolve();
      const expected = new Ok({
        [`game:${get_MOCKED_UUID(1)}`]: {
          subscribedAt: NOW_TIMESTAMP,
        },
        [`room:${get_MOCKED_UUID(2)}`]: {
          subscribedAt: NOW_TIMESTAMP,
        },
      });

      expect(actual).toEqual(expected);
    });

    it('unsubscribe', async () => {
      await AsyncResult.all(
        session.createClient({ id: '1st' }),
        session.createClient({ id: '2nd' }),
        session.createResource('room', {
          type: 'play',
        })
      ).resolve();

      await session
        .subscribeToResource('1st', {
          resourceId: get_MOCKED_UUID(1),
          resourceType: 'room',
        })
        .resolve();

      await session
        .subscribeToResource('2nd', {
          resourceId: get_MOCKED_UUID(1),
          resourceType: 'room',
        })
        .resolve();

      const resourceId = get_MOCKED_UUID(1);

      const actual = await session
        .unsubscribeFromResource('1st', {
          resourceType: 'room',
          resourceId: resourceId,
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

    it('unsuscribes automatically on client removal', async () => {
      await session.createClient({ id: '1st' }).resolve();
      await session.createResource('room', { type: 'play' }).resolve(); // id: get_MOCKED_UUID(1)
      await session.createResource('game', { type: 'maha' }).resolve(); // id: get_MOCKED_UUID(2)

      await session
        .subscribeToResource('1st', {
          resourceId: get_MOCKED_UUID(1),
          resourceType: 'room',
        })
        .resolve();

      await session
        .subscribeToResource('1st', {
          resourceId: get_MOCKED_UUID(2),
          resourceType: 'game',
        })
        .resolve();

      const actualRoomResourceSubscribers = await session
        .getResourceSubscribers({
          resourceId: get_MOCKED_UUID(1),
          resourceType: 'room',
        })
        .resolve();

      expect(actualRoomResourceSubscribers).toEqual(
        new Ok([
          {
            id: '1st',
            subscriptions: {
              [`room:${get_MOCKED_UUID(1)}`]: {
                subscribedAt: NOW_TIMESTAMP,
              },
              [`game:${get_MOCKED_UUID(2)}`]: {
                subscribedAt: NOW_TIMESTAMP,
              },
            },
          },
        ])
      );

      const actualGameResourceSubscribers = await session
        .getResourceSubscribers({
          resourceId: get_MOCKED_UUID(2),
          resourceType: 'game',
        })
        .resolve();

      expect(actualGameResourceSubscribers).toEqual(
        new Ok([
          {
            id: '1st',
            subscriptions: {
              [`room:${get_MOCKED_UUID(1)}`]: {
                subscribedAt: NOW_TIMESTAMP,
              },
              [`game:${get_MOCKED_UUID(2)}`]: {
                subscribedAt: NOW_TIMESTAMP,
              },
            },
          },
        ])
      );

      expect(actualGameResourceSubscribers).toEqual(
        new Ok([
          {
            id: '1st',
            subscriptions: {
              [`room:${get_MOCKED_UUID(1)}`]: {
                subscribedAt: NOW_TIMESTAMP,
              },
              [`game:${get_MOCKED_UUID(2)}`]: {
                subscribedAt: NOW_TIMESTAMP,
              },
            },
          },
        ])
      );

      const actualClient = await session.removeClient('1st').resolve();

      const expectedClient = new Ok({
        index: 1,
        length: 0,
        item: undefined,
      });

      expect(actualClient).toEqual(expectedClient);

      const actualRoomResourceSubscribersAfterClientRemoval = await session
        .getResourceSubscribers({
          resourceId: get_MOCKED_UUID(1),
          resourceType: 'room',
        })
        .resolve();

      expect(actualRoomResourceSubscribersAfterClientRemoval).toEqual(
        new Ok([])
      );

      const actualGameResourceSubscribersAfterRemoval = await session
        .getResourceSubscribers({
          resourceId: get_MOCKED_UUID(2),
          resourceType: 'game',
        })
        .resolve();

      expect(actualGameResourceSubscribersAfterRemoval).toEqual(new Ok([]));
    });
  });
});
