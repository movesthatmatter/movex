import counterReducer from './util/counterReducer';
import { MockMasterClientEmitter } from './util/MockMasterClientEmitter';
import gameReducer, { initialGameState } from './util/gameReducer';
import { Movex } from '../lib/Movex';

import {
  toResourceIdentifierObj,
  toResourceIdentifierStr,
} from 'movex-core-util';
import { LocalMovexStore } from '../lib/master-store';
import { GetReducerState } from '../lib/tools/reducer';
import { MovexMasterResource } from '../lib/master/MovexMasterResource';
import { MasterClientConnection } from '../lib/io/MasterClientConnection';
import { computeCheckedState } from '../lib/util';

let mockUUIDCount = 0;
const get_MOCKED_UUID = (count: number) => `MOCK-UUID-${count}`;
jest.mock('uuid', () => ({ v4: () => get_MOCKED_UUID(++mockUUIDCount) }));

const counterRid = toResourceIdentifierObj({
  resourceId: '1',
  resourceType: 'counter',
});

const gameRid = toResourceIdentifierObj({
  resourceId: '1',
  resourceType: 'game',
});

test('Initial State', () => {});

test('Create State', async () => {
  const localStore = new LocalMovexStore<
    GetReducerState<typeof counterReducer>
  >();
  const masterResource = new MovexMasterResource(counterReducer, localStore);
  const mockEmitter = new MockMasterClientEmitter(masterResource);

  // Client
  // mock.emit(
  //   'getResourceState',
  //   {
  //     rid: '' as ResourceIdentifier<string>,
  //   },
  //   (res) => {
  //     if (res.ok) {
  //       // res.val[0].count
  //     }
  //     // res[0];
  //   }
  // );

  // // server

  // mock.on('getResourceState', async (msg, ack) => {
  //   // get resource async
  //   // new AsyncOk({} as MovexStoreItem<Get>).map((s) => {
  //   //   ack(new Ok(s.state));
  //   //   // ack(new Ok(s.state));
  //   // });
  // });

  // TODO Next: Came up with the concept of EventEmitter (local, mock, socket) which is the only piece that needs to be mocked for testing

  const movex = new Movex(
    new MasterClientConnection('test-client-1', mockEmitter)
  );

  const counterResource = movex.register('counter', counterReducer);

  const actual = await counterResource
    .create({
      count: 2,
    })
    .resolveUnwrap();

  expect(actual).toEqual({
    id: get_MOCKED_UUID(1),
    state: computeCheckedState({ count: 2 }),
    rid: toResourceIdentifierStr({
      resourceId: get_MOCKED_UUID(1),
      resourceType: 'counter',
    }),
  });

  // const r = counterResource.use(rid);

  // const expected = computeCheckedState({
  //   count: 0,
  // });

  // expect(resource.get()).toEqual(expected);
});

// test('Dispatch Public Action', () => {
//   const movex = createMovexInstance({
//     url: 'n/a',
//     apiKey: 'n/a',
//   });

//   const resource = movex.registerResourceReducer(counterRid, counterReducer);

//   resource.dispatch({ type: 'increment' });

//   const expected = computeCheckedState({
//     count: 1,
//   });

//   expect(resource.get()).toEqual(expected);
// });

// test('Dispatch Private Action', () => {
//   const movex = createMovexInstance({
//     url: 'n/a',
//     apiKey: 'n/a',
//   });

//   const resource = movex.registerResourceReducer(gameRid, gameReducer);

//   resource.dispatchPrivate(
//     {
//       type: 'submitMoves',
//       payload: {
//         color: 'white',
//         moves: ['w:e2-e4', 'w:d2-d4'],
//       },
//       isPrivate: true,
//     },

//     { type: 'readySubmissionState', payload: { color: 'white' } }
//   );

//   const expected = computeCheckedState({
//     ...initialGameState,
//     submission: {
//       ...initialGameState.submission,
//       status: 'partial',
//       white: {
//         canDraw: false,
//         moves: ['w:e2-e4', 'w:d2-d4'],
//       },
//     },
//   });

//   expect(resource.get()).toEqual(expected);
// });

// // TODO: Add more tests
