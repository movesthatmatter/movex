import { computeCheckedState, invoke } from 'movex-core-util';
import {
  initialSpeedPushGameState,
  SpeedGameState,
  simpleChessGameReducer,
  tillNextTick,
  initialSimpleChessGameState,
  SimpleChessGameState,
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

test('dispatching an action that DOES NOT affect timeLefts YET keeps everything in sync', async () => {
  const TOTAL_TIME_LEFT = 30;

  const INITIAL_GAME_STATE: SimpleChessGameState = {
    ...initialSimpleChessGameState,
    timeLefts: { white: TOTAL_TIME_LEFT, black: TOTAL_TIME_LEFT },
  };

  const {
    clients: [aResource, bResource],
    $util,
  } = orchestrator.orchestrate({
    clientIds: ['a', 'b'],
    reducer: simpleChessGameReducer,
    resourceType: 'match',
  });

  const { rid } = await aResource.create(INITIAL_GAME_STATE).resolveUnwrap();

  const aMovex = aResource.bind(rid);
  const bMovex = bResource.bind(rid);

  const syncStateSpyA = jest.spyOn(aMovex, 'syncState');
  const syncStateSpyB = jest.spyOn(bMovex, 'syncState');

  await tillNextTick();

  syncStateSpyA.mockImplementation(() => {
    console.error('syncStateSpyA should not be called');
  });

  syncStateSpyB.mockImplementation(() => {
    console.error('syncStateSpyB should not be called');
  });

  expect(syncStateSpyA).toHaveBeenCalledTimes(1); // jest already called the spyOn once
  expect(syncStateSpyB).toHaveBeenCalledTimes(1); // jest already called the spyOn once

  const FIRST_LOCAL_REQUEST_AT = 1;
  MockDate.set(FIRST_LOCAL_REQUEST_AT);

  $util.pauseEmit();

  aMovex.dispatch(({ $queries }) => ({
    type: 'move',
    payload: {
      by: 'white',
      at: $queries.now(),
      sq: 'e4',
    },
  }));

  await tillNextTick();

  invoke(function checkBeforeMasterEmit() {
    const actualForA = aMovex.getCheckedState();
    const actualForB = bMovex.getCheckedState();

    const expectedForA = computeCheckedState<SimpleChessGameState>({
      status: 'ongoing',
      winner: undefined,
      lastMoveAt: FIRST_LOCAL_REQUEST_AT,
      lastMoveBy: 'white',
      timeLefts: {
        white: INITIAL_GAME_STATE.timeLefts.white,
        black: INITIAL_GAME_STATE.timeLefts.black,
      },
    });

    const expectedForB = computeCheckedState(INITIAL_GAME_STATE);

    expect(actualForA).toEqual(expectedForA);
    expect(actualForB).toEqual(expectedForB);

    expect(syncStateSpyA).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
    expect(syncStateSpyB).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
  });

  const FIRST_MASTER_REQUEST_AT = 3;
  MockDate.set(new Date(FIRST_MASTER_REQUEST_AT));

  // Resume emits
  $util.resumeEmit();
  await tillNextTick();

  await invoke(async function checkAfterMasterEmit() {
    const actualForA = aMovex.getCheckedState();
    const actualForB = bMovex.getCheckedState();
    const actualMaster = await $util.getMasterPublicState(rid).resolveUnwrap();

    const expectedForA = computeCheckedState<SimpleChessGameState>({
      status: 'ongoing',
      winner: undefined,
      lastMoveAt: FIRST_MASTER_REQUEST_AT,
      lastMoveBy: 'white',
      timeLefts: {
        white: INITIAL_GAME_STATE.timeLefts.white,
        black: INITIAL_GAME_STATE.timeLefts.black,
      },
    });

    // Check that the 2 peer states are in sync after master emits
    const expectedForB = expectedForA;

    const expectedOnMaster = expectedForA;

    expect(actualForA).toEqual(expectedForA);
    expect(actualForB).toEqual(expectedForB);
    expect(actualMaster).toEqual(expectedOnMaster);

    expect(syncStateSpyA).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
    expect(syncStateSpyB).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
  });

  await tillNextTick();

  await invoke(async function checkMasterStateGetOnDemand() {
    const TIME_SINCE_LAST_REQUEST = 2;
    MockDate.set(FIRST_MASTER_REQUEST_AT + TIME_SINCE_LAST_REQUEST);

    const actual = (await aResource.get(rid).resolveUnwrap()).state;
    const actualOrchestratorMaster = (
      await $util.getMasterPublicState(rid).resolveUnwrap()
    )[0];

    // The masterState is alredy same as the localState becase the $transformState already got applied locally
    const expected: SimpleChessGameState = {
      status: 'ongoing',
      winner: undefined,
      lastMoveAt: FIRST_MASTER_REQUEST_AT,
      lastMoveBy: 'white',
      timeLefts: {
        white: INITIAL_GAME_STATE.timeLefts.white,
        black: INITIAL_GAME_STATE.timeLefts.black - TIME_SINCE_LAST_REQUEST,
      },
    };

    expect(actual).toEqual(expected);
    expect(actualOrchestratorMaster).toEqual(expected);

    expect(syncStateSpyA).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
    expect(syncStateSpyB).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
  });
});

test('dispatching an action that affects timeLefts acknowledges them and forwards them correctly (keeping them in sync)', async () => {
  const TOTAL_TIME_LEFT = 30;

  const INITIAL_GAME_STATE: SimpleChessGameState = {
    ...initialSimpleChessGameState,
    timeLefts: { white: TOTAL_TIME_LEFT, black: TOTAL_TIME_LEFT },
  };

  const {
    clients: [aResource, bResource],
    $util,
  } = orchestrator.orchestrate({
    clientIds: ['a', 'b'],
    reducer: simpleChessGameReducer,
    resourceType: 'match',
  });

  const { rid } = await aResource.create(INITIAL_GAME_STATE).resolveUnwrap();

  const aMovex = aResource.bind(rid);
  const bMovex = bResource.bind(rid);

  const syncStateSpyA = jest.spyOn(aMovex, 'syncState');
  const syncStateSpyB = jest.spyOn(bMovex, 'syncState');

  await tillNextTick();

  syncStateSpyA.mockImplementation(() => {
    console.error('syncStateSpyA should not be called');
  });

  syncStateSpyB.mockImplementation(() => {
    console.error('syncStateSpyB should not be called');
  });

  expect(syncStateSpyA).toHaveBeenCalledTimes(1); // jest already called the spyOn once
  expect(syncStateSpyB).toHaveBeenCalledTimes(1); // jest already called the spyOn once

  const FIRST_LOCAL_REQUEST_AT = 1;
  MockDate.set(FIRST_LOCAL_REQUEST_AT);

  // First Request (does not affect time lefts)
  aMovex.dispatch(({ $queries }) => ({
    type: 'move',
    payload: {
      by: 'white',
      at: $queries.now(),
      sq: 'e4',
    },
  }));

  await tillNextTick();

  // Second Request (affects timelefts)

  $util.pauseEmit();

  const SECOND_LOCAL_REQUEST_AT = 5;
  MockDate.set(SECOND_LOCAL_REQUEST_AT);

  aMovex.dispatch(({ $queries }) => ({
    type: 'move',
    payload: {
      by: 'black',
      at: $queries.now(),
      sq: 'd6',
    },
  }));

  invoke(function checkBeforeMasterEmit() {
    const actualForA = aMovex.getCheckedState();
    const actualForB = bMovex.getCheckedState();

    const expectedForA = computeCheckedState<SimpleChessGameState>({
      status: 'ongoing',
      winner: undefined,
      lastMoveAt: FIRST_LOCAL_REQUEST_AT,
      lastMoveBy: 'white',
      timeLefts: {
        white: INITIAL_GAME_STATE.timeLefts.white,
        black: INITIAL_GAME_STATE.timeLefts.black,
      },
    });

    const expectedForB = expectedForA;

    expect(actualForA).toEqual(expectedForA);
    expect(actualForB).toEqual(expectedForB);

    expect(syncStateSpyA).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
    expect(syncStateSpyB).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
  });

  const SECOND_MASTER_REQUEST_AT = SECOND_LOCAL_REQUEST_AT + 3;
  MockDate.set(new Date(SECOND_MASTER_REQUEST_AT));

  // Resume emits
  $util.resumeEmit();
  await tillNextTick();

  await invoke(async function checkAfterMasterEmit() {
    const actualForA = aMovex.getCheckedState();
    const actualForB = bMovex.getCheckedState();
    const actualMaster = await $util.getMasterPublicState(rid).resolveUnwrap();

    const expectedForA = computeCheckedState<SimpleChessGameState>({
      status: 'ongoing',
      winner: undefined,
      lastMoveAt: SECOND_MASTER_REQUEST_AT,
      lastMoveBy: 'black',
      timeLefts: {
        white: INITIAL_GAME_STATE.timeLefts.white,
        black:
          TOTAL_TIME_LEFT - (SECOND_MASTER_REQUEST_AT - FIRST_LOCAL_REQUEST_AT),
      },
    });

    // Check that the 2 peer states are in sync after master emits
    const expectedForB = expectedForA;

    const expectedMaster = expectedForA;

    expect(actualForA).toEqual(expectedForA);
    expect(actualForB).toEqual(expectedForB);
    expect(actualMaster).toEqual(expectedMaster);

    expect(syncStateSpyA).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
    expect(syncStateSpyB).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
  });

  await tillNextTick();

  await invoke(
    async function checkMasterStateGetOnDemandChangesTimeLeftsOnRead() {
      const TIME_SINCE_LAST_REQUEST = 12;
      MockDate.set(SECOND_MASTER_REQUEST_AT + TIME_SINCE_LAST_REQUEST);

      const actual = (await aResource.get(rid).resolveUnwrap()).state;
      const actualOrchestratorMaster = (
        await $util.getMasterPublicState(rid).resolveUnwrap()
      )[0];

      // The masterState is already same as the localState becase the $transformState already got applied locally
      const expected: SimpleChessGameState = {
        status: 'ongoing',
        winner: undefined,
        lastMoveAt: SECOND_MASTER_REQUEST_AT,
        lastMoveBy: 'black',
        timeLefts: {
          white: INITIAL_GAME_STATE.timeLefts.white - TIME_SINCE_LAST_REQUEST,
          black:
            TOTAL_TIME_LEFT -
            (SECOND_MASTER_REQUEST_AT - FIRST_LOCAL_REQUEST_AT),
        },
      };

      expect(actual).toEqual(expected);
      expect(actualOrchestratorMaster).toEqual(expected);

      expect(syncStateSpyA).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
      expect(syncStateSpyB).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
    }
  );

  // await invoke(async function checkMasterStateGetOnDemand() {
  //   const TIME_SINCE_LAST_REQUEST = 12;
  //   MockDate.set(SECOND_MASTER_REQUEST_AT + TIME_SINCE_LAST_REQUEST);

  //   const actual = (await aResource.get(rid).resolveUnwrap()).state;

  //   // The masterState is already same as the localState becase the $transformState already got applied locally
  //   const expected: SimpleChessGameState = {
  //     status: 'ongoing',
  //     winner: undefined,
  //     lastMoveAt: SECOND_MASTER_REQUEST_AT,
  //     lastMoveBy: 'black',
  //     timeLefts: {
  //       white: INITIAL_GAME_STATE.timeLefts.white - TIME_SINCE_LAST_REQUEST,
  //       black:
  //         TOTAL_TIME_LEFT - (SECOND_MASTER_REQUEST_AT - FIRST_LOCAL_REQUEST_AT),
  //     },
  //   };

  //   expect(actual).toEqual(expected);

  //   expect(syncStateSpyA).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
  //   expect(syncStateSpyB).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
  // });
});

test.only('dispatching after an mutating $stateTransformer, still keeps the states in sync correctly', async () => {
  const INITIAL_GAME_STATE: Extract<
    SimpleChessGameState,
    { status: 'ongoing' }
  > = {
    status: 'ongoing',
    winner: undefined,
    lastMoveAt: 12,
    lastMoveBy: 'black',
    timeLefts: {
      white: 23,
      black: 34,
    },
  };

  const {
    clients: [aResource, bResource],
    $util,
  } = orchestrator.orchestrate({
    clientIds: ['a', 'b'],
    reducer: simpleChessGameReducer,
    resourceType: 'match',
  });

  const { rid } = await aResource.create(INITIAL_GAME_STATE).resolveUnwrap();

  const aMovex = aResource.bind(rid);
  const bMovex = bResource.bind(rid);

  const syncStateSpyA = jest.spyOn(aMovex, 'syncState');
  const syncStateSpyB = jest.spyOn(bMovex, 'syncState');

  await tillNextTick();

  syncStateSpyA.mockImplementation(() => {
    console.error('syncStateSpyA should not be called');
  });

  syncStateSpyB.mockImplementation(() => {
    console.error('syncStateSpyB should not be called');
  });

  expect(syncStateSpyA).toHaveBeenCalledTimes(1); // jest already called the spyOn once
  expect(syncStateSpyB).toHaveBeenCalledTimes(1); // jest already called the spyOn once

  await invoke(
    async function checkMasterStateGetOnDemandChangesTimeLeftsOnReadOnPlayerA() {
      const TIME_SINCE_LAST_REQUEST = 3;
      MockDate.set(INITIAL_GAME_STATE.lastMoveAt + TIME_SINCE_LAST_REQUEST);

      const actual = (await aResource.get(rid).resolveUnwrap()).state;
      const actualOrchestratorMaster = (
        await $util.getMasterPublicState(rid).resolveUnwrap()
      )[0];

      // The masterState is already same as the localState becase the $transformState already got applied locally
      const expected: SimpleChessGameState = {
        status: 'ongoing',
        winner: undefined,
        lastMoveAt: INITIAL_GAME_STATE.lastMoveAt,
        lastMoveBy: 'black',
        timeLefts: {
          white: INITIAL_GAME_STATE.timeLefts.white - TIME_SINCE_LAST_REQUEST,
          black: INITIAL_GAME_STATE.timeLefts.black,
        },
      };

      console.log(
        'actual after on demand for a',
        JSON.stringify({ actual, now: new Date().getTime() }, null, 2)
      );

      expect(actual).toEqual(expected);
      expect(actualOrchestratorMaster).toEqual(expected);

      expect(syncStateSpyA).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
      expect(syncStateSpyB).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
    }
  );

  await invoke(
    async function checkMasterStateGetOnDemandChangesTimeLeftsOnReadOnPlayerB() {
      const TIME_SINCE_LAST_REQUEST = 5;
      MockDate.set(INITIAL_GAME_STATE.lastMoveAt + TIME_SINCE_LAST_REQUEST);

      const actual = (await bResource.get(rid).resolveUnwrap()).state;
      const actualOrchestratorMaster = (
        await $util.getMasterPublicState(rid).resolveUnwrap()
      )[0];

      console.log(
        'actual after on demand for b',
        JSON.stringify({ actual, now: new Date().getTime() }, null, 2)
      );

      // The masterState is already same as the localState becase the $transformState already got applied locally
      const expected: SimpleChessGameState = {
        status: 'ongoing',
        winner: undefined,
        lastMoveAt: INITIAL_GAME_STATE.lastMoveAt,
        lastMoveBy: 'black',
        timeLefts: {
          white: INITIAL_GAME_STATE.timeLefts.white - TIME_SINCE_LAST_REQUEST,
          black: INITIAL_GAME_STATE.timeLefts.black,
        },
      };

      expect(actual).toEqual(expected);
      expect(actualOrchestratorMaster).toEqual(expected);

      expect(syncStateSpyA).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
      expect(syncStateSpyB).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
    }
  );

  await invoke(
    async function checkStateBetweenClientsAfterInidividualStateTransformationsAbove() {
      const actualForA = aMovex.getCheckedState();
      const actualForB = bMovex.getCheckedState();
      // const actualOrchestratorMaster = await $util.getMasterPublicState(rid).resolveUnwrap();

      console.log(
        'actualForA',
        JSON.stringify({ actualForA, actualForB, now: new Date().getTime() }, null, 2)
      );

      const expected = computeCheckedState<SimpleChessGameState>({
        status: 'ongoing',
        winner: undefined,
        lastMoveAt: INITIAL_GAME_STATE.lastMoveAt,
        lastMoveBy: 'black',
        timeLefts: {
          white: INITIAL_GAME_STATE.timeLefts.white,
          black: INITIAL_GAME_STATE.timeLefts.black,
        },
      });

      expect(actualForA).toEqual(expected);
      // expect(actualForA).toEqual(actualOrchestratorMaster);
    }
  );
  // await invoke(async function checkMasterStateGetOnDemand() {
  //   const TIME_SINCE_LAST_REQUEST = 12;
  //   MockDate.set(SECOND_MASTER_REQUEST_AT + TIME_SINCE_LAST_REQUEST);

  //   const actual = (await aResource.get(rid).resolveUnwrap()).state;

  //   // The masterState is already same as the localState becase the $transformState already got applied locally
  //   const expected: SimpleChessGameState = {
  //     status: 'ongoing',
  //     winner: undefined,
  //     lastMoveAt: SECOND_MASTER_REQUEST_AT,
  //     lastMoveBy: 'black',
  //     timeLefts: {
  //       white: INITIAL_GAME_STATE.timeLefts.white - TIME_SINCE_LAST_REQUEST,
  //       black:
  //         TOTAL_TIME_LEFT - (SECOND_MASTER_REQUEST_AT - FIRST_LOCAL_REQUEST_AT),
  //     },
  //   };

  //   expect(actual).toEqual(expected);

  //   expect(syncStateSpyA).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
  //   expect(syncStateSpyB).toHaveBeenCalledTimes(1); // ensure no other state-sync calls happened
  // });
});

test('requesting the state again (via unrelated action dispatch) will return the updated time lefts', () => {});

test('requesting the state again (via GET) will return the updated time lefts', () => {});
