import { SessionResource } from '@matterio/core-util';
import MockDate from 'mockdate';
import { Store, createMockStore } from 'relational-redis-store';
import { AsyncResult } from 'ts-async-results';
import { Ok } from 'ts-results';
import { SessionStore } from './SessionStore';

let mockUUIDCount = 0;
const get_MOCKED_UUID = (count: number) => `MOCK-UUID-${count}`;
jest.mock('uuid', () => ({ v4: () => get_MOCKED_UUID(++mockUUIDCount) }));

describe('SessionStore', () => {
  let store: Store<any>;
  let session: SessionStore<{
    room: SessionResource<{
      type: 'play' | 'analysis' | 'meetup';
    }>;
    game: SessionResource<{
      type: 'maha' | 'chess' | 'dojo';
    }>;
  }>;

  const NOW_TIMESTAMP = new Date().getTime();

  const noop = () => {};

  const silentLogger = {
    ...console,
    info: noop,
    log: noop,
    warn: noop,
    error: noop,
  };

  beforeAll(async () => {
    // Date
    MockDate.set(NOW_TIMESTAMP);

    // Store
    store = createMockStore({ logger: silentLogger });
    session = new SessionStore(store);
  });

  afterAll(() => {
    // Date
    MockDate.reset();
  });

  beforeEach(() => {
    mockUUIDCount = 0;

    store.flush();
  });

  describe('clients', () => {
    describe('creation', () => {
      it('creates a client without input', async () => {
        const actual = await session.createClient().resolve();
        const expected = new Ok({
          index: 1,
          length: 1,
          item: {
            id: get_MOCKED_UUID(1),
            subscriptions: {},
          },
        });

        expect(actual).toEqual(expected);
      });

      it('creates a client with given ID', async () => {
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

      it('creates a client with given Info', async () => {
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
      it('gets a client by the returned ClientId', async () => {
        const createdClients = [
          await session.createClient().resolve(),
          await session.createClient().resolve(),
          await session.createClient().resolve(),
        ];

        expect(createdClients.map((r) => r.ok)).toEqual(
          createdClients.map(() => true)
        );

        const [
          createdClientAResult,
          createdClientBResult,
          createdClientCResult,
        ] = createdClients;

        if (
          !(
            createdClientAResult.ok &&
            createdClientBResult.ok &&
            createdClientCResult.ok
          )
        ) {
          return;
        }

        const actual = await session
          .getClient(createdClientBResult.val.item.id)
          .resolve();

        const expected = new Ok({
          id: get_MOCKED_UUID(2),
          subscriptions: {},
        });

        expect(actual).toEqual(expected);
      });

      it('gets a client by the given ClientId', async () => {
        const createdClients = [
          await session.createClient({ id: 'test-id' }).resolve(),
          await session.createClient().resolve(),
          await session.createClient().resolve(),
        ];

        expect(createdClients.map((r) => r.ok)).toEqual(
          createdClients.map(() => true)
        );

        const [
          createdClientAResult,
          createdClientBResult,
          createdClientCResult,
        ] = createdClients;

        if (
          !(
            createdClientAResult.ok &&
            createdClientBResult.ok &&
            createdClientCResult.ok
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

      it('gets all clients', async () => {
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
      it('removes a client by returned id after it got created', async () => {
        const createdClientResult = await session.createClient().resolve();

        expect(createdClientResult.ok).toBe(true);

        if (!createdClientResult.ok) {
          return;
        }

        const actual = await session
          .removeClient(createdClientResult.val.item.id)
          .resolve();

        const expected = new Ok({
          index: 1,
          length: 0,
          item: {
            id: get_MOCKED_UUID(1),
            subscriptions: {},
          },
        });

        expect(actual).toEqual(expected);
      });

      it('removes all clients and their subscriptions', async () => {
        const result = await AsyncResult.all(
          session.createClient(),
          session.createClient(),
          session.createClient({ id: 'test-id' }),
          session.createClient(),
          session.createResource({
            resourceType: 'room',
            resourceData: {
              type: 'play',
            },
          }),
          session.createResource({
            resourceType: 'game',
            resourceData: {
              type: 'dojo',
            },
          })
        )
          .flatMap(
            ([
              { item: client1 },
              { item: client2 },
              { item: client3 },
              { item: client4 },
              { item: room },
              { item: game },
            ]) => {
              return AsyncResult.all(
                session.subscribeToResource(client1.id, {
                  resourceType: room.type,
                  resourceId: room.item.id,
                }),
                session.subscribeToResource(client2.id, {
                  resourceType: game.type,
                  resourceId: game.item.id,
                }),
                session.subscribeToResource(client1.id, {
                  resourceType: game.type,
                  resourceId: game.item.id,
                })
              );
            }
          )
          .resolve();

        expect(result.ok).toBe(true);
        if (!result.ok) {
          return;
        }

        const actualClientsBeforeDeletion = await session
          .getAllClients()
          .resolve();

        const expected = new Ok([
          {
            id: get_MOCKED_UUID(1),
            subscriptions: {
              'game:MOCK-UUID-5': {
                subscribedAt: NOW_TIMESTAMP,
              },
              'room:MOCK-UUID-4': {
                subscribedAt: NOW_TIMESTAMP,
              },
            },
          },
          {
            id: get_MOCKED_UUID(2),
            subscriptions: {
              'game:MOCK-UUID-5': {
                subscribedAt: NOW_TIMESTAMP,
              },
            },
          },
          {
            id: 'test-id',
            subscriptions: {},
          },
          {
            id: get_MOCKED_UUID(3),
            subscriptions: {},
          },
        ]);

        expect(actualClientsBeforeDeletion).toEqual(expected);

        await session.removeAllClients().resolve();

        const actual = await session.getAllClients().resolve();

        expect(actual).toEqual(new Ok([]));
      });
    });
  });

  describe('resources', () => {
    test('creates a resource', async () => {
      const actual = await session
        .createResource({
          resourceType: 'room',
          resourceData: {
            type: 'play',
          },
        })
        .resolve();

      const expected = new Ok({
        index: 1,
        length: 1,
        item: {
          type: 'room',
          item: {
            id: get_MOCKED_UUID(1),
            type: 'play',
          },
          subscribers: {},
        },
      });

      expect(actual).toEqual(expected);
    });

    test('creates a resource with given id', async () => {
      const actual = await session
        .createResource({
          resourceId: 'test-res-1',
          resourceType: 'room',
          resourceData: {
            type: 'play',
          },
        })
        .resolve();

      const expected = new Ok({
        index: 1,
        length: 1,
        item: {
          type: 'room',
          item: {
            id: 'test-res-1',
            type: 'play',
          },
          subscribers: {},
        },
      });

      expect(actual).toEqual(expected);
    });

    it('gets a resource', async () => {
      await session
        .createResource({
          resourceType: 'game',
          resourceData: {
            type: 'maha',
          },
        })
        .resolve();
      await session
        .createResource({
          resourceType: 'game',
          resourceData: { type: 'maha' },
        })
        .resolve();
      await session
        .createResource({
          resourceType: 'room',
          resourceData: { type: 'play' },
        })
        .resolve();

      const actual = await session
        .getResource({ resourceType: 'game', resourceId: get_MOCKED_UUID(2) })
        .resolve();

      const expected = new Ok({
        type: 'game',
        item: {
          id: get_MOCKED_UUID(2),
          type: 'maha',
        },
        subscribers: {},
      });

      expect(actual).toEqual(expected);
    });

    // TODO: Add test for resource update +
    //  returning all the subcribers so the SDK can pass them further to the clienta

    it('removes a resource', async () => {
      const actual = await session
        .createResource({
          resourceType: 'game',
          resourceData: { type: 'maha' },
        })
        .flatMap(({ item: resource }) =>
          session.removeResource({
            resourceType: 'game',
            resourceId: resource.item.id,
          })
        )
        .resolve();

      const expected = new Ok({
        index: 1,
        item: {
          resourceId: get_MOCKED_UUID(1),
          resourceType: 'game',
          subscribers: {},
        },
        length: 0,
      });

      expect(actual).toEqual(expected);
    });

    it('remove all resources of type', async () => {
      await AsyncResult.all(
        session.createResource({
          resourceType: 'game',
          resourceData: { type: 'maha' },
        }),
        session.createResource({
          resourceType: 'game',
          resourceData: { type: 'dojo' },
        }),
        session.createResource({
          resourceType: 'game',
          resourceData: { type: 'maha' },
        }),
        session.createResource({
          resourceType: 'game',
          resourceData: { type: 'chess' },
        }),
        session.createResource({
          resourceType: 'room',
          resourceData: { type: 'meetup' },
        })
      ).resolve();

      await session.removeAllResourcesOfType('game').resolve();

      const actual = await session.getAllResourcesOfType('game').resolve();

      const expected = new Ok([]);

      expect(actual).toEqual(expected);
    });

    it('gets all resources of type', async () => {
      await AsyncResult.all(
        session.createResource({
          resourceType: 'game',
          resourceData: { type: 'maha' },
        }),
        session.createResource({
          resourceType: 'room',
          resourceData: { type: 'play' },
        }),
        session.createResource({
          resourceType: 'game',
          resourceData: { type: 'chess' },
        }),
        session.createResource({
          resourceType: 'room',
          resourceData: { type: 'analysis' },
        })
      ).resolve();

      const actual = await session.getAllResourcesOfType('game').resolve();

      const expected = new Ok([
        {
          $resource: 'game',
          id: get_MOCKED_UUID(1),
          data: {
            type: 'maha',
          },
          subscribers: {},
        },
        {
          $resource: 'game',
          id: get_MOCKED_UUID(3),
          data: {
            type: 'chess',
          },
          subscribers: {},
        },
      ]);

      expect(actual).toEqual(expected);
    });
  });

  describe('subscriptions', () => {
    it('subscribes a Client to a Resource', async () => {
      let clientId = 'TBD';
      let resourceId = 'TBD';

      const actual = await AsyncResult.all(
        session.createClient(),
        session.createResource({
          resourceType: 'room',
          resourceData: {
            type: 'play',
          },
        })
      )
        .flatMap(([{ item: client }, { item: resource }]) => {
          // This is just for testing
          clientId = client.id;
          resourceId = resource.item.id;

          return session.subscribeToResource(client.id, {
            resourceType: 'room',
            resourceId: resource.item.id,
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
          type: 'room',
          item: {
            id: resourceId,
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
        session.createResource({
          resourceType: 'game',
          resourceData: {
            type: 'maha',
          },
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

    it('gets all client subscriptions (series)', async () => {
      await AsyncResult.all(
        session.createClient({ id: '1st' }),
        session.createClient({ id: '2nd' }),
        session.createResource({
          resourceType: 'game',
          resourceData: { type: 'maha' },
        }), // id: get_MOCKED_UUID(1)
        session.createResource({
          resourceType: 'room',
          resourceData: { type: 'play' },
        }), // id: get_MOCKED_UUID(2)
        session.createResource({
          resourceType: 'room',
          resourceData: { type: 'play' },
        }) //  id: get_MOCKED_UUID(3)
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

    it('gets all client subscriptions (parallel)', async () => {
      await AsyncResult.all(
        session.createClient({ id: '1st' }),
        session.createClient({ id: '2nd' }),
        session.createResource({
          resourceType: 'game',
          resourceData: { type: 'maha' },
        }), // id: get_MOCKED_UUID(1)
        session.createResource({
          resourceType: 'room',
          resourceData: { type: 'play' },
        }), // id: get_MOCKED_UUID(2)
        session.createResource({
          resourceType: 'room',
          resourceData: { type: 'play' },
        }) //  id: get_MOCKED_UUID(3)
      ).resolve();

      await AsyncResult.all(
        session.subscribeToResource('1st', {
          resourceType: 'room',
          resourceId: get_MOCKED_UUID(2),
        }),
        session.subscribeToResource('1st', {
          resourceType: 'game',
          resourceId: get_MOCKED_UUID(1),
        }),
        session.subscribeToResource('2nd', {
          resourceType: 'room',
          resourceId: get_MOCKED_UUID(2),
        })
      ).resolve();

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
        session.createResource({
          resourceType: 'room',
          resourceData: {
            type: 'play',
          },
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
          type: 'room',
          item: {
            id: resourceId,
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
      await session
        .createResource({
          resourceType: 'room',
          resourceData: { type: 'play' },
        })
        .resolve(); // id: get_MOCKED_UUID(1)
      await session
        .createResource({
          resourceType: 'game',
          resourceData: { type: 'maha' },
        })
        .resolve(); // id: get_MOCKED_UUID(2)

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

      const actualClient = await session.removeClient('1st').resolve();

      const expectedClient = new Ok({
        index: 1,
        length: 0,
        item: {
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

    it('unsubcribes all the clients automatically on resource removal', async () => {
      await session.createClient({ id: '1st' }).resolve();
      await session.createClient({ id: '2nd' }).resolve();
      await session
        .createResource({
          resourceType: 'room',
          resourceData: { type: 'play' },
        })
        .resolve(); // id: get_MOCKED_UUID(1)

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

      const firstClientSubscriptions = await session
        .getClientSubscriptions('1st')
        .resolve();

      expect(firstClientSubscriptions).toEqual(
        new Ok({
          [`room:${get_MOCKED_UUID(1)}`]: {
            subscribedAt: NOW_TIMESTAMP,
          },
        })
      );

      const secondClientSubscriptions = await session
        .getClientSubscriptions('2nd')
        .resolve();

      expect(secondClientSubscriptions).toEqual(
        new Ok({
          [`room:${get_MOCKED_UUID(1)}`]: {
            subscribedAt: NOW_TIMESTAMP,
          },
        })
      );

      await session
        .removeResource({
          resourceId: get_MOCKED_UUID(1),
          resourceType: 'room',
        })
        .resolve();

      const firstClientSubscriptionsAfterRemoval = await session
        .getClientSubscriptions('1st')
        .resolve();

      expect(firstClientSubscriptionsAfterRemoval).toEqual(new Ok({}));

      const secondClientSubscriptionsAfterRemoval = await session
        .getClientSubscriptions('2nd')
        .resolve();

      expect(secondClientSubscriptionsAfterRemoval).toEqual(new Ok({}));
    });
  });
});
