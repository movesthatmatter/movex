import counterReducer from './util/counterReducer';
import gameReducer, { initialGameState } from './util/gameReducer';
import { MockConnectionEmitter } from './util/MockConnectionEmitter';
import { Movex } from '../lib/client/Movex';
import { tillNextTick } from 'movex-core-util';
import { LocalMovexStore } from '../lib/master-store';
import { GetReducerState, MovexReducer } from '../lib/tools/reducer';
import { MovexMasterResource } from '../lib/master/MovexMasterResource';
import { computeCheckedState } from '../lib/util';
import { ConnectionToMaster } from '../lib/client/ConnectionToMaster';
import { AnyAction } from '../lib/tools/action';

const getMovex = <TState extends any, TAction extends AnyAction = AnyAction>(
  reducer: MovexReducer<TState, TAction>,
  clientId = 'test-client'
) => {
  const localStore = new LocalMovexStore<GetReducerState<typeof reducer>>();
  const masterResource = new MovexMasterResource(reducer, localStore);

  const mockEmitter = new MockConnectionEmitter(masterResource, clientId);

  return new Movex(new ConnectionToMaster(clientId, mockEmitter));
};

test('Create', async () => {
  const movex = getMovex(counterReducer);

  const counterResource = movex.register('counter', counterReducer);

  const actual = await counterResource
    .create({
      count: 2,
    })
    .resolveUnwrap();

  expect(actual).toEqual({
    rid: actual.rid, // The id isn't too important here
    state: computeCheckedState({ count: 2 }),
  });
});

test('Use', async () => {
  const movex = getMovex(counterReducer);
  const counterResource = movex.register('counter', counterReducer);

  const { rid } = await counterResource.create({ count: 2 }).resolveUnwrap();

  const actual = counterResource.use(rid);
  const actualDefaultState = actual.get();

  expect(actualDefaultState).toEqual(computeCheckedState({ count: 0 }));

  await tillNextTick();

  const expected = computeCheckedState({ count: 2 });

  expect(actual.get()).toEqual(expected);
});

test('Dispatch Public Action', async () => {
  const movex = getMovex(counterReducer);
  const counterResource = movex.register('counter', counterReducer);

  const { rid } = await counterResource.create({ count: 2 }).resolveUnwrap();

  const r = counterResource.use(rid);

  r.dispatch({ type: 'increment' });

  await tillNextTick();

  const actual = r.get();
  const expected = computeCheckedState({
    count: 3,
  });

  expect(actual).toEqual(expected);
});

test('Dispatch Private Action', async () => {
  const movex = getMovex(counterReducer);
  const counterResource = movex.register('counter', gameReducer);

  const { rid } = await counterResource
    .create(initialGameState)
    .resolveUnwrap();

  const r = counterResource.use(rid);

  r.dispatchPrivate(
    {
      type: 'submitMoves',
      payload: {
        color: 'white',
        moves: ['w:e2-e4', 'w:d2-d4'],
      },
      isPrivate: true,
    },

    { type: 'readySubmissionState', payload: { color: 'white' } }
  );

  await tillNextTick();

  const actual = r.get();

  const expected = computeCheckedState({
    ...initialGameState,
    submission: {
      ...initialGameState.submission,
      status: 'partial',
      white: {
        canDraw: false,
        moves: ['w:e2-e4', 'w:d2-d4'],
      },
    },
  });

  expect(actual).toEqual(expected);
});

// // TODO: Add more tests
