import counterReducer, { initialCounterState } from './util/counterReducer';
import gameReducer, { initialGameState } from './util/gameReducer';
import {
  invoke,
  noop,
  tillNextTick,
  toResourceIdentifierStr,
} from 'movex-core-util';
import { GetReducerState, MovexReducer } from '../lib/tools/reducer';
import { MovexMasterResource } from '../lib/master/MovexMasterResource';
import { computeCheckedState } from '../lib/util';
import { AnyAction } from '../lib/tools/action';
import { LocalMovexStore } from '../lib/movex-store';
import { UnsubscribeFn } from '../lib/core-types';
import { movexClientMasterOrchestrator } from './util/orchestrator';

let destroyMovexMock: UnsubscribeFn = noop;

const rid = toResourceIdentifierStr({
  resourceType: 'counter',
  resourceId: 'test',
});

const orchestrator = movexClientMasterOrchestrator(rid);

beforeEach(async () => {
  // destroyMovexMock();
  await orchestrator.unsubscribe();
});

// const getMovex = <TState extends any, TAction extends AnyAction = AnyAction>(
//   reducer: MovexReducer<TState, TAction>,
//   clientId = 'test-client'
// ) => {
//   const localStore = new LocalMovexStore<GetReducerState<typeof reducer>>();
//   const masterResource = new MovexMasterResource(reducer, localStore);

//   const { movex, destroy } = mockMovex(clientId, masterResource);

//   destroyMovexMock = destroy;

//   return movex;
// };

describe('All', () => {
  test('Create', async () => {
    const [counterResource] = await orchestrator.orchestrate({
      clientIds: ['test'],
      reducer: counterReducer,
      resourceType: 'counter',
      initialState: initialCounterState,
    });

    const actual = await counterResource
      .create({
        count: 2,
      })
      .resolveUnwrap();

    expect(actual).toEqual({
      rid: actual.rid, // The id isn't too important here
      state: computeCheckedState({ count: 2 }),
    });
  }, 200);

  test('Bind', async () => {
    const [counterResource] = await orchestrator.orchestrate({
      clientIds: ['test'],
      reducer: counterReducer,
      resourceType: 'counter',
      initialState: initialCounterState,
    });

    const { rid } = await counterResource.create({ count: 2 }).resolveUnwrap();

    const actual = counterResource.bind(rid);
    const actualDefaultState = actual.state;

    expect(actualDefaultState).toEqual(computeCheckedState({ count: 0 }));

    await tillNextTick();

    const expected = computeCheckedState({ count: 2 });

    expect(actual.state).toEqual(expected);
  });

  test('Dispatch Public Action', async () => {
    const [counterResource] = await orchestrator.orchestrate({
      clientIds: ['test'],
      reducer: counterReducer,
      resourceType: 'counter',
      initialState: initialCounterState,
    });

    const { rid } = await counterResource.create({ count: 2 }).resolveUnwrap();

    const r = counterResource.bind(rid);

    r.dispatch({ type: 'increment' });

    await tillNextTick();

    const actual = r.get();
    const expected = computeCheckedState({
      count: 3,
    });

    expect(actual).toEqual(expected);
  });

  test('Dispatch Private Action', async () => {
    const [gameResource] = await orchestrator.orchestrate({
      clientIds: ['test'],
      reducer: gameReducer,
      resourceType: 'game',
      initialState: initialGameState,
    });

    const { rid } = await gameResource.create(initialGameState).resolveUnwrap();

    const r = gameResource.bind(rid);

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
});

// // TODO: Add more tests
