// import { Store, createMockStore } from 'relational-redis-store';
// import { AsyncResult } from 'ts-async-results';
// import { Ok } from 'ts-results';
// import { SessionStore } from './SessionStore';

// let mockUUIDCount = 0;
// const get_MOCKED_UUID = (count: number) => `MOCK-UUID-${count}`;
// jest.mock('uuid', () => ({ v4: () => get_MOCKED_UUID(++mockUUIDCount) }));

// describe('AppService', () => {
//   let store: Store<any>;
//   let session: SessionStore;

//   let oldConsoleLog = console.log;
//   let oldConsoleInfo = console.info;

//   beforeAll(async () => {
//     const noop = () => {};
//     console.log = noop;
//     console.info = noop;

//     store = createMockStore();
//     session = new SessionStore(store);
//   });

//   afterAll(() => {
//     console.log = oldConsoleLog;
//     console.info = oldConsoleInfo;
//   });

//   beforeEach(() => {
//     mockUUIDCount = 0;

//     store.flush();
//   });

//   describe('peer', () => {
//     describe('creation', () => {
//       it('creates a peer without input', async () => {
//         const actual = await session.createPeer().resolve();
//         const expected = new Ok({
//           index: 1,
//           length: 1,
//           item: {
//             id: get_MOCKED_UUID(1),
//             subscriptions: {},
//           },
//         });

//         expect(actual).toEqual(expected);
//       });

//       it('creates a peer with given ID', async () => {
//         const actual = await session.createPeer({ id: 'test-id' }).resolve();
//         const expected = new Ok({
//           index: 1,
//           length: 1,
//           item: {
//             id: 'test-id',
//             subscriptions: {},
//           },
//         });

//         expect(actual).toEqual(expected);
//       });

//       it('creates a peer with given Info', async () => {
//         const info = {
//           name: 'Jim',
//           age: 23,
//         };
//         const actual = await session
//           .createPeer({
//             info,
//           })
//           .resolve();

//         const expected = new Ok({
//           index: 1,
//           length: 1,
//           item: {
//             id: get_MOCKED_UUID(1),
//             subscriptions: {},
//             info,
//           },
//         });

//         expect(actual).toEqual(expected);
//       });
//     });

//     describe('get', () => {
//       it('gets a peer by the returned PeerId', async () => {
//         const createdPeers = [
//           await session.createPeer().resolve(),
//           await session.createPeer().resolve(),
//           await session.createPeer().resolve(),
//         ];

//         expect(createdPeers.map((r) => r.ok)).toEqual(
//           createdPeers.map(() => true)
//         );

//         const [createdPeerAResult, createdPeerBResult, createdPeerCResult] =
//           createdPeers;

//         if (
//           !(
//             createdPeerAResult.ok &&
//             createdPeerBResult.ok &&
//             createdPeerCResult.ok
//           )
//         ) {
//           return;
//         }

//         const actual = await session
//           .getPeer(createdPeerBResult.val.item.id)
//           .resolve();

//         const expected = new Ok({
//           id: get_MOCKED_UUID(2),
//           subscriptions: {},
//         });

//         expect(actual).toEqual(expected);
//       });

//       it('gets a peer by the given PeerId', async () => {
//         const createdPeers = [
//           await session.createPeer({ id: 'test-id' }).resolve(),
//           await session.createPeer().resolve(),
//           await session.createPeer().resolve(),
//         ];

//         expect(createdPeers.map((r) => r.ok)).toEqual(
//           createdPeers.map(() => true)
//         );

//         const [createdPeerAResult, createdPeerBResult, createdPeerCResult] =
//           createdPeers;

//         if (
//           !(
//             createdPeerAResult.ok &&
//             createdPeerBResult.ok &&
//             createdPeerCResult.ok
//           )
//         ) {
//           return;
//         }

//         const actual = await session.getPeer('test-id').resolve();

//         const expected = new Ok({
//           id: 'test-id',
//           subscriptions: {},
//         });

//         expect(actual).toEqual(expected);
//       });

//       it('gets all peers', async () => {
//         await session.createPeer({ id: 'test-id' }).resolve();
//         await session.createPeer().resolve();
//         await session.createPeer().resolve();

//         const actual = await session.getAllPeers().resolve();
//         const expected = new Ok([
//           {
//             id: 'test-id',
//             subscriptions: {},
//           },
//           {
//             id: get_MOCKED_UUID(1),
//             subscriptions: {},
//           },
//           {
//             id: get_MOCKED_UUID(2),
//             subscriptions: {},
//           },
//         ]);

//         expect(actual).toEqual(expected);
//       });
//     });

//     describe('removal', () => {
//       it('removes a peer by returned id after it got created', async () => {
//         const createdPeerResult = await session.createPeer().resolve();

//         expect(createdPeerResult.ok).toBe(true);

//         if (!createdPeerResult.ok) {
//           return;
//         }

//         const actual = await session
//           .removePeer(createdPeerResult.val.item.id)
//           .resolve();

//         const expected = new Ok({
//           index: 1,
//           length: 0,
//           item: undefined,
//         });

//         expect(actual).toEqual(expected);
//       });
//     });
//   });

//   describe('topic', () => {
//     it('create a topic', async () => {
//       const actual = await session.createTopic('topic-1').resolve();
//       const expected = new Ok({
//         index: 1,
//         length: 1,
//         item: {
//           id: 'topic-1',
//           subscribers: {},
//         },
//       });

//       expect(actual).toEqual(expected);
//     });

//     it('gets a topic by name(id)', async () => {
//       await session.createTopic('topic-2').resolve();
//       await session.createTopic('topic-1').resolve();

//       const actual = await session.getTopic('topic-2').resolve();

//       const expected = new Ok({
//         id: 'topic-2',
//         subscribers: {},
//       });

//       expect(actual).toEqual(expected);
//     });
//   });

//   describe('subscriptions', () => {
//     it('subscribes to a topic', async () => {
//       const actual = await AsyncResult.all(
//         session.createPeer(),
//         session.createTopic('topic-1')
//       )
//         .flatMap(([{ item: peer }]) =>
//           session.subscribeToTopic('topic-1', peer.id)
//         )
//         .resolve();

//       const expected = new Ok({
//         topic: {
//           id: 'topic-1',
//           subscribers: { 'MOCK-UUID-1': null },
//         },
//         peer: {
//           id: get_MOCKED_UUID(1),
//           subscriptions: {
//             'topic-1': null,
//           },
//         },
//       });

//       expect(actual).toEqual(expected);
//     });

//     it('get all subscribers from a topic', async () => {
//       await AsyncResult.all(
//         session.createPeer({ id: '1st' }),
//         session.createPeer({ id: '2nd' }),
//         session.createPeer({ id: '3rd' }),
//         session.createTopic('topic-1')
//       ).resolve();

//       await session.subscribeToTopic('topic-1', '2nd').resolve();
//       await session.subscribeToTopic('topic-1', '1st').resolve();

//       const actual = await session.getTopicSubscribers('topic-1').resolve();

//       const expected = new Ok([
//         {
//           id: '2nd',
//           subscriptions: {
//             'topic-1': null,
//           },
//         },
//         {
//           id: '1st',
//           subscriptions: {
//             'topic-1': null,
//           },
//         },
//       ]);

//       expect(actual).toEqual(expected);
//     });

//     it('get all peer subscriptions', async () => {
//       await AsyncResult.all(
//         session.createPeer({ id: '1st' }),
//         session.createPeer({ id: '2nd' }),
//         session.createTopic('topic-1'),
//         session.createTopic('topic-2'),
//         session.createTopic('topic-3')
//       ).resolve();

//       await session.subscribeToTopic('topic-1', '1st').resolve();
//       await session.subscribeToTopic('topic-2', '1st').resolve();
//       await session.subscribeToTopic('topic-2', '2nd').resolve();

//       const actual = await session.getPeerSubscriptions('1st').resolve();

//       const expected = new Ok([
//         {
//           id: 'topic-1',
//           subscribers: {
//             '1st': null,
//           },
//         },
//         {
//           id: 'topic-2',
//           subscribers: {
//             '1st': null,
//             '2nd': null,
//           },
//         },
//       ]);

//       expect(actual).toEqual(expected);
//     });

//     it('ubsubscribe', async () => {
//       await AsyncResult.all(
//         session.createPeer({ id: '1st' }),
//         session.createPeer({ id: '2nd' }),
//         session.createTopic('topic-1')
//       ).resolve();

//       await session.subscribeToTopic('topic-1', '1st').resolve();
//       await session.subscribeToTopic('topic-1', '2nd').resolve();

//       const actual = await session
//         .unsubscribeFromTopic('topic-1', '1st')
//         .resolve();

//       const expected = new Ok({
//         topic: {
//           id: 'topic-1',
//           subscribers: {
//             '2nd': null,
//           },
//         },
//         peer: {
//           id: '1st',
//           subscriptions: {},
//         },
//       });

//       expect(actual).toEqual(expected);
//     });
//   });
// });
