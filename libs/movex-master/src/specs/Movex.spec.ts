import { computeCheckedState, toResourceIdentifierObj } from 'movex-core-util';
import {
  counterReducer,
  gameReducer,
  initialGameState,
  tillNextTick,
} from 'movex-specs-util';
import { movexClientMasterOrchestrator } from 'movex-master';

const orchestrator = movexClientMasterOrchestrator();

beforeEach(async () => {
  await orchestrator.unsubscribe();
});

describe('All', () => {
  test('Create', async () => {
    const {
      clients: [counterResource],
    } = orchestrator.orchestrate({
      clientIds: ['test'],
      reducer: counterReducer,
      resourceType: 'counter',
    });

    const actual = await counterResource.create({ count: 2 }).resolveUnwrap();

    expect(actual).toEqual({
      rid: toResourceIdentifierObj(actual.rid), // The id isn't too important here
      state: { count: 2 },
      subscribers: {},
    });
  }, 200);

  test('Bind', async () => {
    const {
      clients: [counterResource],
    } = orchestrator.orchestrate({
      clientIds: ['test'],
      reducer: counterReducer,
      resourceType: 'counter',
    });

    const { rid } = await counterResource.create({ count: 2 }).resolveUnwrap();

    const actual = counterResource.bind(rid);
    const actualDefaultState = actual.state;

    expect(actualDefaultState.checkedState).toEqual(
      computeCheckedState({ count: 0 })
    );

    await tillNextTick();

    const expected = {
      checkedState: computeCheckedState({ count: 2 }),
      subscribers: { test: {} },
    };

    expect(actual.state).toEqual(expected);
  });

  test('Dispatch Public Action', async () => {
    const {
      clients: [counterResource],
    } = orchestrator.orchestrate({
      clientIds: ['test'],
      reducer: counterReducer,
      resourceType: 'counter',
    });

    const { rid } = await counterResource.create({ count: 2 }).resolveUnwrap();

    const r = counterResource.bind(rid);

    r.dispatch({ type: 'increment' });

    await tillNextTick();

    const actual = r.get();
    const expected = {
      checkedState: computeCheckedState({ count: 3 }),
      subscribers: { test: {} },
    };

    expect(actual).toEqual(expected);
  });

  test('Dispatch Private Action', async () => {
    const {
      clients: [gameResource],
    } = orchestrator.orchestrate({
      clientIds: ['test-user'],
      reducer: gameReducer,
      resourceType: 'game',
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

    const actual = r.state;

    const expected = {
      checkedState: computeCheckedState({
        ...initialGameState,
        submission: {
          ...initialGameState.submission,
          status: 'partial',
          white: {
            canDraw: false,
            moves: ['w:e2-e4', 'w:d2-d4'],
          },
        },
      }),
      subscribers: {
        'test-user': {},
      },
    };

    expect(actual).toEqual(expected);
  });
});

// TODO: Add tests for Subscribers Client Info

// TODO: Add more tests
