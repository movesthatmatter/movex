import { computeCheckedState } from 'movex-core-util';
import {
  initialSpeedPushGameState,
  SpeedGameState,
  speedPushGameReducer,
  tillNextTick,
} from 'movex-specs-util';
import { movexClientMasterOrchestrator } from 'movex-master';
import MockDate from 'mockdate';

const orchestrator = movexClientMasterOrchestrator();

beforeEach(async () => {
  await orchestrator.unsubscribe();
});

test('State is changed (to status="completed") when a related ACTION DISPATCH triggers it', async () => {
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
      timeToNextPushMs: initialSpeedPushGameState.timeToNextPushMs,
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
      at: FIRST_PUSH_AT + initialSpeedPushGameState.timeToNextPushMs + 1,
    },
  });

  await tillNextTick();

  const actual = r.getCheckedState();

  const expected = computeCheckedState<SpeedGameState>({
    status: 'completed',
    winner: 'red',
    lastPushAt: FIRST_PUSH_AT,
    lastPushBy: 'red',
    timeToNextPushMs: initialSpeedPushGameState.timeToNextPushMs,
  });

  expect(actual).toEqual(expected);
});

test('State is changed (to status="completed") when state is READ directly (w/o dispatching an action)', async () => {
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

  const actualAfterWhiteMove = r.getCheckedState();

  const expectedAfterWhiteMove = computeCheckedState<SpeedGameState>({
    status: 'ongoing',
    winner: undefined,
    lastPushAt: FIRST_PUSH_AT,
    lastPushBy: 'red',
    timeToNextPushMs: initialSpeedPushGameState.timeToNextPushMs,
  });

  expect(actualAfterWhiteMove).toEqual(expectedAfterWhiteMove);

  MockDate.set(new Date(FIRST_PUSH_AT + initialSpeedPushGameState.timeToNextPushMs + 1));

  const actual = (await speedGameResource.get(rid).resolveUnwrap()).state;

  const expected = computeCheckedState<SpeedGameState>({
    status: 'completed',
    winner: 'red',
    lastPushAt: FIRST_PUSH_AT,
    lastPushBy: 'red',
    timeToNextPushMs: initialSpeedPushGameState.timeToNextPushMs,
  });

  expect(actual).toEqual(expected);
});

test('State is changed (to status="completed") when ANY UNRELATED ACTION gets dispatched', async () => {
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

  const actualAfterWhiteMove = r.getCheckedState();

  const expectedAfterWhiteMove = computeCheckedState<SpeedGameState>({
    status: 'ongoing',
    winner: undefined,
    lastPushAt: FIRST_PUSH_AT,
    lastPushBy: 'red',
    timeToNextPushMs: initialSpeedPushGameState.timeToNextPushMs,
  });

  expect(actualAfterWhiteMove).toEqual(expectedAfterWhiteMove);

  MockDate.set(new Date(FIRST_PUSH_AT + initialSpeedPushGameState.timeToNextPushMs + 1));

  r.dispatch({ type: 'unrelatedAction' });

  await tillNextTick();

  const actual = r.getCheckedState();

  const expected = computeCheckedState<SpeedGameState>({
    status: 'completed',
    winner: 'red',
    lastPushAt: FIRST_PUSH_AT,
    lastPushBy: 'red',
    timeToNextPushMs: initialSpeedPushGameState.timeToNextPushMs,
  });

  expect(actual).toEqual(expected);
});
