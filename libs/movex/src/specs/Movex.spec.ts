import counterReducer from './util/counterReducer';
import gameReducer, { initialGameState } from './util/gameReducer';
import { MockConnectionEmitter } from './util/MockConnectionEmitter';
import { Movex } from '../lib/client/Movex';
import { invoke, noop, tillNextTick } from 'movex-core-util';
import { GetReducerState, MovexReducer } from '../lib/tools/reducer';
import { MovexMasterResource } from '../lib/master/MovexMasterResource';
import { computeCheckedState } from '../lib/util';
import { ConnectionToMaster } from '../lib/client/ConnectionToMaster';
import { AnyAction } from '../lib/tools/action';
import { LocalMovexStore } from '../lib/movex-store';
import { IOEvents } from '../lib/io-connection/io-events';
import { UnsubscribeFn } from '../lib/core-types';

let unsubscribers: UnsubscribeFn[] = [];

beforeEach(async () => {
  unsubscribers.forEach(invoke);
});

const getMovex = <TState extends any, TAction extends AnyAction = AnyAction>(
  reducer: MovexReducer<TState, TAction>,
  clientId = 'test-client'
) => {
  const localStore = new LocalMovexStore<GetReducerState<typeof reducer>>();
  const masterResource = new MovexMasterResource(reducer, localStore);

  const mockEmitter = new MockConnectionEmitter(clientId);

  // TODO: Add ubsuscriber for the listeners

  unsubscribers = [
    mockEmitter.subscribe('createResource', (r, ack) => {
      console.log('[Movex.spec] on createResource listener', r);

      masterResource
        .create(r.resourceType, r.resourceState)
        .resolve()
        .then((r) => {
          const res = {
            ok: r.ok,
            err: r.err,
            val: r.val,
          } as ReturnType<IOEvents<TState, TAction, string>['createResource']>;

          ack(res);
        });
    }),

    mockEmitter.subscribe('getResourceState', (r, ack) => {
      masterResource
        .getState(r.rid, clientId)
        .resolve()
        .then((r) => {
          const res = {
            ok: r.ok,
            err: r.err,
            val: r.val,
          } as ReturnType<
            IOEvents<TState, TAction, string>['getResourceState']
          >;

          ack(res);
        });
    }),
  ];

  return new Movex(new ConnectionToMaster(clientId, mockEmitter));
};

describe('All', () => {
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

  test('Bind', async () => {
    const movex = getMovex(counterReducer);
    const counterResource = movex.register('counter', counterReducer);

    const { rid } = await counterResource.create({ count: 2 }).resolveUnwrap();

    const actual = counterResource.bind(rid);
    const actualDefaultState = actual.state;

    expect(actualDefaultState).toEqual(computeCheckedState({ count: 0 }));

    await tillNextTick();

    const expected = computeCheckedState({ count: 2 });

    expect(actual.state).toEqual(expected);
  });

  test('Dispatch Public Action', async () => {
    const movex = getMovex(counterReducer);
    const counterResource = movex.register('counter', counterReducer);

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
    const movex = getMovex(counterReducer);
    const counterResource = movex.register('counter', gameReducer);

    const { rid } = await counterResource
      .create(initialGameState)
      .resolveUnwrap();

    const r = counterResource.bind(rid);

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
