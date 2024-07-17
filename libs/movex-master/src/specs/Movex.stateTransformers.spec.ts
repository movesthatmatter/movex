import { computeCheckedState, toResourceIdentifierObj } from 'movex-core-util';
import {
  ABORT_TIME_MS,
  counterReducer,
  gameReducer,
  initialGameState,
  initialMatchReducerWithTransformerState,
  initialSpeedPushGameState,
  matchReducerWithTransformer,
  SpeedGameState,
  speedPushGameReducer,
  SPEED_GAME_TIME_TO_PUSH_MS,
  tillNextTick,
} from 'movex-specs-util';
import { movexClientMasterOrchestrator } from 'movex-master';
import MockDate from 'mockdate';

const orchestrator = movexClientMasterOrchestrator();

beforeEach(async () => {
  await orchestrator.unsubscribe();
});

xdescribe('Game Status Changes on Action Dispatch', () => {
  test('Second player loses for waiting too long to dospatch the "push" action', async () => {
    const {
      clients: [speedGameResource],
    } = orchestrator.orchestrate({
      clientIds: ['test-user'],
      reducer: speedPushGameReducer,
      resourceType: 'match',
    });

    const { rid } = await speedGameResource
      .create(initialSpeedPushGameState)
      .resolveUnwrap();

    const r = speedGameResource.bind(rid);

    const FIRST_PUSH_AT = 1;

    r.dispatch({
      type: 'push',
      payload: {
        by: 'red',
        at: FIRST_PUSH_AT,
      },
    });

    await tillNextTick();

    const actualAfterWhiteMove = r.get();

    const expectedAfterWhiteMove = {
      checkedState: computeCheckedState<SpeedGameState>({
        status: 'ongoing',
        winner: undefined,
        lastPushAt: FIRST_PUSH_AT,
        lastPushBy: 'red',
      }),
      subscribers: {
        'test-user': {
          id: 'test-user',
          info: {},
        },
      },
    };

    expect(actualAfterWhiteMove).toEqual(expectedAfterWhiteMove);

    // Second Player WAITS too Long to "push"

    r.dispatch({
      type: 'push',
      payload: {
        by: 'blu',
        at: FIRST_PUSH_AT + SPEED_GAME_TIME_TO_PUSH_MS + 1,
      },
    });

    await tillNextTick();

    const actual = r.get();

    const expected = {
      checkedState: computeCheckedState<SpeedGameState>({
        status: 'completed',
        winner: 'red',
        lastPushAt: FIRST_PUSH_AT,
        lastPushBy: 'red',
      }),
      subscribers: {
        'test-user': {
          id: 'test-user',
          info: {},
        },
      },
    };

    expect(actual).toEqual(expected);
  });
});

describe('Game Status Changes on Read (via $stateTransformer)', () => {
  test('Second player loses for waiting too long to dospatch the "push" action', async () => {
    

    const {
      clients: [speedGameResource],
    } = orchestrator.orchestrate({
      clientIds: ['test-user'],
      reducer: speedPushGameReducer,
      resourceType: 'match',
    });

    const { rid } = await speedGameResource
      .create(initialSpeedPushGameState)
      .resolveUnwrap();

    const r = speedGameResource.bind(rid);

    const FIRST_PUSH_AT = 1;
    
    MockDate.set(new Date(123));

    r.dispatch({
      type: 'push',
      payload: {
        by: 'red',
        at: FIRST_PUSH_AT,
      },
    });

    await tillNextTick();

    const actualAfterWhiteMove = r.get();

    const expectedAfterWhiteMove = {
      checkedState: computeCheckedState<SpeedGameState>({
        status: 'ongoing',
        winner: undefined,
        lastPushAt: FIRST_PUSH_AT,
        lastPushBy: 'red',
      }),
      subscribers: {
        'test-user': {
          id: 'test-user',
          info: {},
        },
      },
    };

    expect(actualAfterWhiteMove).toEqual(expectedAfterWhiteMove);

    // Second Player WAITS too Long to "push"

    // r.dispatch({
    //   type: 'push',
    //   payload: {
    //     by: 'blu',
    //     at: FIRST_PUSH_AT + SPEED_GAME_TIME_TO_PUSH_MS + 1,
    //   },
    // });



    // await tillNextTick();

    // how to sync the client with the server after read?

    

    const actual = (await speedGameResource.get(rid).resolveUnwrap());

    const expected = {
      checkedState: computeCheckedState<SpeedGameState>({
        status: 'completed',
        winner: 'red',
        lastPushAt: FIRST_PUSH_AT,
        lastPushBy: 'red',
      }),
      subscribers: {
        'test-user': {
          id: 'test-user',
          info: {},
        },
      },
    };

    expect(actual).toEqual(expected);
  });
});
