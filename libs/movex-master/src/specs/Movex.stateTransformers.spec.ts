import { computeCheckedState } from 'movex-core-util';
import {
  initialSpeedPushGameState,
  SpeedGameState,
  speedPushGameReducer,
  tillNextTick,
} from 'movex-specs-util';
import {
  createSanitizedMovexClient,
  movexClientMasterOrchestrator,
} from 'movex-master';
import MockDate from 'mockdate';

const orchestrator = movexClientMasterOrchestrator();

beforeEach(async () => {
  await orchestrator.unsubscribe();
});

afterEach(() => {
  MockDate.reset();
});

test('State is changed (to status="completed") when a related ACTION DISPATCH triggers it', async () => {
  const REQUEST_AT = 1;

  MockDate.set(REQUEST_AT);

  const {
    clients: [speedGameResource],
  } = orchestrator.orchestrate({
    clientIds: ['test-user'],
    reducer: speedPushGameReducer,
    resourceType: 'match',
    // masterContextParams: { requestAt: REQUEST_AT },
  });

  const { rid } = await speedGameResource
    .create(initialSpeedPushGameState)
    .resolveUnwrap();

  const r = speedGameResource.bind(rid);

  const syncStateSpy = jest.spyOn(r, 'syncState'); // jest already called the spyOn once

  await tillNextTick();

  expect(syncStateSpy).toHaveBeenCalledTimes(1);

  const FIRST_PUSH_AT = REQUEST_AT + 1;

  r.dispatch({
    type: 'push',
    payload: {
      by: 'red',
      at: FIRST_PUSH_AT,
    },
  });

  await tillNextTick();

  expect(syncStateSpy).toHaveBeenCalledTimes(1); // still the same number of calls

  // createMasterContext
  // how to mock the create

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
      'test-user': createSanitizedMovexClient('test-user'),
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

// test.only('State is changed (to status="completed") when state is READ directly (w/o dispatching an action)', async () => {
test('State is changed (to status="completed") after the 1st dispatch due to local-run $stateTransform with the movexContext', async () => {
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

  const syncStateSpy = jest.spyOn(r, 'syncState');

  await tillNextTick();

  expect(syncStateSpy).toHaveBeenCalledTimes(1); // jest already called the spyOn once

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
    status: 'completed',
    winner: 'red',
    lastPushAt: FIRST_PUSH_AT,
    lastPushBy: 'red',
    timeToNextPushMs: initialSpeedPushGameState.timeToNextPushMs,
  });

  expect(actualAfterWhiteMove).toEqual(expectedAfterWhiteMove);

  MockDate.set(
    new Date(FIRST_PUSH_AT + initialSpeedPushGameState.timeToNextPushMs + 1)
  );

  const actual = (await speedGameResource.get(rid).resolveUnwrap()).state;

  // The masterState is alredy same as the localState becase the $transformState already got applied locally
  const expected = expectedAfterWhiteMove[0];

  expect(actual).toEqual(expected);

  expect(syncStateSpy).toHaveBeenCalledTimes(1); // jest already called the spyOn once
});

test('State is changed (to status="completed") when ANY UNRELATED ACTION gets dispatched w/o having to resync (initial checksums mismatch)', async () => {
  const REQUEST_AT = 1;

  MockDate.set(REQUEST_AT);

  const {
    clients: [speedGameResource],
    $util,
  } = orchestrator.orchestrate({
    clientIds: ['test-user'],
    reducer: speedPushGameReducer,
    resourceType: 'match',
  });

  const { rid } = await speedGameResource
    .create(initialSpeedPushGameState)
    .resolveUnwrap();

  const r = speedGameResource.bind(rid);

  const FIRST_PUSH_AT = REQUEST_AT + 1;

  const syncStateSpy = jest.spyOn(r, 'syncState');

  await tillNextTick();

  expect(syncStateSpy).toHaveBeenCalledTimes(1); // jest already called the spyOn once

  r.dispatch({
    type: 'push',
    payload: {
      by: 'red',
      at: FIRST_PUSH_AT,
    },
  });

  await tillNextTick();

  // TODO: Left it here - as I don't know what else to do to sync it after the dispatch!

  const actualAfterWhiteMove = r.getCheckedState();

  const expectedAfterWhiteMove = computeCheckedState<SpeedGameState>({
    status: 'ongoing',
    winner: undefined,
    lastPushAt: FIRST_PUSH_AT,
    lastPushBy: 'red',
    timeToNextPushMs: initialSpeedPushGameState.timeToNextPushMs,
  });

  expect(actualAfterWhiteMove).toEqual(expectedAfterWhiteMove);

  MockDate.set(
    new Date(FIRST_PUSH_AT + initialSpeedPushGameState.timeToNextPushMs + 1)
  );

  r.dispatch({ type: 'unrelatedAction' });

  await tillNextTick();

  expect(syncStateSpy).toHaveBeenCalledTimes(1); // only the spyOn call

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

describe('fwdActions to Peers', () => {
  test('action dispatch that triggers $stateTransform forwards correctly to peers without any state resync', async () => {
    const {
      clients: [aResource, bResource],
    } = orchestrator.orchestrate({
      clientIds: ['a', 'b'],
      reducer: speedPushGameReducer,
      resourceType: 'match',
    });

    const { rid } = await aResource
      .create(initialSpeedPushGameState)
      .resolveUnwrap();

    const aMovex = aResource.bind(rid);
    const bMovex = bResource.bind(rid);

    const FIRST_PUSH_AT = 1;

    const syncStateSpyA = jest.spyOn(aMovex, 'syncState');
    const syncStateSpyB = jest.spyOn(bMovex, 'syncState');

    await tillNextTick();

    expect(syncStateSpyA).toHaveBeenCalledTimes(1); // jest already called the spyOn once
    expect(syncStateSpyB).toHaveBeenCalledTimes(1); // jest already called the spyOn once

    aMovex.dispatch({
      type: 'push',
      payload: {
        by: 'red',
        at: FIRST_PUSH_AT,
      },
    });

    await tillNextTick();

    const actualAMovexAfterWhiteMove = aMovex.getCheckedState();

    const actualBMovexAfterWhiteMove = bMovex.getCheckedState();

    const expectedAfterWhiteMove = computeCheckedState<SpeedGameState>({
      status: 'completed',
      winner: 'red',
      lastPushAt: FIRST_PUSH_AT,
      lastPushBy: 'red',
      timeToNextPushMs: initialSpeedPushGameState.timeToNextPushMs,
    });

    expect(actualAMovexAfterWhiteMove).toEqual(expectedAfterWhiteMove);
    expect(actualBMovexAfterWhiteMove).toEqual(expectedAfterWhiteMove);

    MockDate.set(
      new Date(FIRST_PUSH_AT + initialSpeedPushGameState.timeToNextPushMs + 1)
    );

    const actual = (await aResource.get(rid).resolveUnwrap()).state;

    // The masterState is alredy same as the localState becase the $transformState already got applied locally
    const expected = expectedAfterWhiteMove[0];

    expect(actual).toEqual(expected);

    expect(syncStateSpyA).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
    expect(syncStateSpyB).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
  });
});
