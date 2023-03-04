import { toResourceIdentifierStr } from 'movex-core-util';
import { MovexMaster } from '../lib/MovexMaster';
import counterReducer, { initialCounterState } from './util/counterReducer';
import gameReducer, { initialGameState } from './util/gameReducer';
import { LocalMovexStore } from '../lib/store';
import { computeCheckedState } from '../lib/util';
import { GetReducerAction } from '../lib/tools/reducer';

const rid = toResourceIdentifierStr({ resourceType: 'c', resourceId: '1' });

test('gets initial state', async () => {
  const master = new MovexMaster(
    counterReducer,
    new LocalMovexStore({
      [rid]: initialCounterState,
    })
  );

  const actualPublic = await master.getPublic(rid).resolveUnwrap();
  const actualByClient = await master.get(rid, 'testClient').resolveUnwrap();

  const expectedPublic = computeCheckedState(initialCounterState);

  expect(actualPublic).toEqual(expectedPublic);
  expect(actualByClient).toEqual(expectedPublic);
});

test('applies public action', async () => {
  const master = new MovexMaster(
    counterReducer,
    new LocalMovexStore({
      [rid]: initialCounterState,
    })
  );

  const clientAId = 'clienA';

  const action: GetReducerAction<typeof counterReducer> = {
    type: 'increment',
  };

  const actual = await master
    .applyAction(rid, clientAId, action)
    .resolveUnwrap();

  const actualPublic = await master.getPublic(rid).resolveUnwrap();
  const actualByClient = await master.get(rid, clientAId).resolveUnwrap();

  const expectedPublic = computeCheckedState({
    ...initialCounterState,
    count: 1,
  });

  expect(actualPublic).toEqual(expectedPublic);
  expect(actualByClient).toEqual(expectedPublic);

  expect(actual).toEqual({
    nextPublic: {
      action,
      checksum: actualPublic[1],
    },
  });
});

test('applies private action', async () => {
  const master = new MovexMaster(
    counterReducer,
    new LocalMovexStore({
      [rid]: initialCounterState,
    })
  );

  const senderClientId = 'senderClient';

  const privateAction: GetReducerAction<typeof counterReducer> = {
    type: 'change',
    payload: 44,
    isPrivate: true,
  };

  const publicAction: GetReducerAction<typeof counterReducer> = {
    type: 'increment',
  };

  const actual = await master
    .applyAction(rid, senderClientId, [privateAction, publicAction])
    .resolveUnwrap();

  const actualPublic = await master.getPublic(rid).resolveUnwrap();
  const actualBySenderClient = await master
    .get(rid, senderClientId)
    .resolveUnwrap();
  const actualByOtherClient = await master
    .get(rid, 'otherClient')
    .resolveUnwrap();

  const expectedPublic = computeCheckedState({
    ...initialCounterState,
    count: 1,
  });

  expect(actualPublic).toEqual(expectedPublic);

  const expectedSenderState = computeCheckedState({
    ...initialCounterState,
    count: 44,
  });

  expect(actualByOtherClient).toEqual(expectedPublic);
  expect(actualBySenderClient).toEqual(expectedSenderState);

  expect(actual).toEqual({
    nextPublic: {
      action: publicAction,
      checksum: expectedPublic[1],
    },
    nextPrivate: {
      action: privateAction,
      checksum: expectedSenderState[1],
    },
    reconciledFwdActions: undefined,
  });
});

test('applies private action WITH Reconciliation', async () => {
  const master = new MovexMaster(
    gameReducer,
    new LocalMovexStore({
      [rid]: initialGameState,
    })
  );

  const whitePlayer = 'white';
  const blackPlayer = 'black';

  const privateWhiteAction: GetReducerAction<typeof gameReducer> = {
    type: 'submitMoves',
    payload: {
      color: 'white',
      moves: ['w:E2-E4'],
    },
    isPrivate: true,
  };

  const publicWhiteAction: GetReducerAction<typeof gameReducer> = {
    type: 'readySubmissionState',
    payload: {
      color: 'white',
    },
  };

  // White Private Action
  const actualBeforeReconciliation = await master
    .applyAction(rid, whitePlayer, [privateWhiteAction, publicWhiteAction])
    .resolveUnwrap();

  const actualPublicBeforeReconciliation = await master
    .getPublic(rid)
    .resolveUnwrap();
  const actualBySenderClientBeforeReconciliation = await master
    .get(rid, whitePlayer)
    .resolveUnwrap();
  const actualByOtherClientBeforeReconciliation = await master
    .get(rid, blackPlayer)
    .resolveUnwrap();

  const expectedPublicBeforeReconciliation = computeCheckedState({
    ...initialGameState,
    submission: {
      ...initialGameState.submission,
      status: 'partial',
      white: {
        canDraw: false,
        moves: [],
      },
    },
  });

  const expectedWhiteBeforeReconciliation = computeCheckedState({
    ...initialGameState,
    submission: {
      ...initialGameState.submission,
      status: 'partial',
      white: {
        canDraw: false,
        moves: ['w:E2-E4'],
      },
    },
  });

  expect(actualPublicBeforeReconciliation).toEqual(
    expectedPublicBeforeReconciliation
  );
  expect(actualByOtherClientBeforeReconciliation).toEqual(
    expectedPublicBeforeReconciliation
  );
  expect(actualBySenderClientBeforeReconciliation).toEqual(
    expectedWhiteBeforeReconciliation
  );

  expect(actualBeforeReconciliation).toEqual({
    nextPublic: {
      action: publicWhiteAction,
      checksum: actualPublicBeforeReconciliation[1],
    },
    nextPrivate: {
      action: privateWhiteAction,
      checksum: actualBySenderClientBeforeReconciliation[1],
    },
    reconciledFwdActions: undefined,
  });

  // Black Private Action (This is also the Reconciliatory Action)
  const privateBlackAction: GetReducerAction<typeof gameReducer> = {
    type: 'submitMoves',
    payload: {
      color: 'black',
      moves: ['b:E7-E5'],
    },
    isPrivate: true,
  };

  const publicBlackAction: GetReducerAction<typeof gameReducer> = {
    type: 'readySubmissionState',
    payload: {
      color: 'black',
    },
  };

  const actuakAfterReconciliation = await master
    .applyAction(rid, whitePlayer, [privateBlackAction, publicBlackAction])
    .resolveUnwrap();

  const actualPublicAfterReconciliation = await master
    .getPublic(rid)
    .resolveUnwrap();
  const actualBySenderClientAfterReconciliation = await master
    .get(rid, whitePlayer)
    .resolveUnwrap();
  const actualByOtherClientAfterReconciliation = await master
    .get(rid, blackPlayer)
    .resolveUnwrap();

  const expectedPublicAfterReconciliation = computeCheckedState({
    ...initialGameState,
    submission: {
      ...initialGameState.submission,
      status: 'partial', // TODO: Should this be partial or already move into the next phase?
      white: {
        canDraw: false,
        moves: ['w:E2-E4'],
      },
      black: {
        canDraw: false,
        moves: ['b:E7-E5'],
      },
    },
  });

  const expectedWhiteAfterReconciliation = computeCheckedState({
    ...initialGameState,
    submission: {
      ...initialGameState.submission,
      status: 'partial',
      white: {
        canDraw: false,
        moves: ['w:E2-E4'],
      },
    },
  });

  const expectedBlackAfterReconciliation = computeCheckedState({
    ...initialGameState,
    submission: {
      ...initialGameState.submission,
      status: 'partial',
      white: {
        canDraw: false,
        moves: ['w:E2-E4'],
      },
    },
  });

  expect(actualPublicAfterReconciliation).toEqual(
    expectedPublicAfterReconciliation
  );

  // expect(actualByOtherClientBeforeReconciliation).toEqual(expectedPublic);

  // expect(actualBySenderClientBeforeReconciliation).toEqual(expectedWhite);

  // expect(actuakAfterReconciliation).toEqual({
  //   nextPublic: {
  //     action: publicBlackAction,
  //     checksum: '2',
  //   },
  //   nextPrivate: {
  //     action: privateBlackAction,
  //     checksum: 2,
  //   },
  //   reconciledFwdActions: {
  //     [whitePlayer]: [privateBlackAction],
  //     [blackPlayer]: [privateWhiteAction],
  //   }
  // })
});

// reducer.$canReconcileState(store.public[0]);
