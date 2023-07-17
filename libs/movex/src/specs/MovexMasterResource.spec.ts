import counterReducer, {
  initialCounterState,
} from './resources/counterReducer';
import { toResourceIdentifierStr } from '../../../movex-core-util/src';
import { MovexMasterResource } from '../lib/master/MovexMasterResource';
import { computeCheckedState } from '../lib/util';
import { GetReducerAction } from '../lib/tools/reducer';
import gameReducer, { initialGameState } from './resources/gameReducer';
import { MemoryMovexStore } from '../lib/movex-store';

const rid = toResourceIdentifierStr({ resourceType: 'c', resourceId: '1' });

test('gets initial state', async () => {
  const master = new MovexMasterResource(
    counterReducer,
    new MemoryMovexStore({
      c: {
        [rid]: initialCounterState,
      },
    })
  );

  const actualPublic = await master.getPublicState(rid).resolveUnwrap();
  const actualByClient = await master
    .getState(rid, 'testClient')
    .resolveUnwrap();

  const expectedPublic = computeCheckedState(initialCounterState);

  expect(actualPublic).toEqual(expectedPublic);
  expect(actualByClient).toEqual(expectedPublic);
});

test('applies public action', async () => {
  const master = new MovexMasterResource(
    counterReducer,
    new MemoryMovexStore({
      c: {
        [rid]: initialCounterState,
      },
    })
  );

  const clientAId = 'clienA';

  const action: GetReducerAction<typeof counterReducer> = {
    type: 'increment',
  };

  const actual = await master
    .applyAction(rid, clientAId, action)
    .resolveUnwrap();

  const actualPublic = await master.getPublicState(rid).resolveUnwrap();
  const actualByClient = await master.getState(rid, clientAId).resolveUnwrap();

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
    peerActions: {
      type: 'forwardable',
      byClientId: {},
    },
  });
});

test('applies only one private action w/o getting to reconciliation', async () => {
  const master = new MovexMasterResource(
    counterReducer,
    new MemoryMovexStore({
      c: {
        [rid]: initialCounterState,
      },
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

  const actualPublicState = await master.getPublicState(rid).resolveUnwrap();
  const actualSenderState = await master
    .getState(rid, senderClientId)
    .resolveUnwrap();

  const actualReceiverState = await master
    .getState(rid, 'otherClient')
    .resolveUnwrap();

  const expectedPublic = computeCheckedState({
    ...initialCounterState,
    count: 1,
  });

  expect(actualPublicState).toEqual(expectedPublic);

  const expectedSenderState = computeCheckedState({
    ...initialCounterState,
    count: 44,
  });

  expect(actualSenderState).toEqual(expectedSenderState);
  expect(actualReceiverState).toEqual(expectedPublic);

  expect(actual).toEqual({
    nextPublic: {
      action: publicAction,
      checksum: expectedPublic[1],
    },
    nextPrivate: {
      action: privateAction,
      checksum: expectedSenderState[1],
    },
    peerActions: {
      type: 'forwardable',
      byClientId: {},
    },
  });
});

test('applies private action UNTIL Reconciliation', async () => {
  const master = new MovexMasterResource(
    gameReducer,
    new MemoryMovexStore({
      c: {
        [rid]: initialGameState,
      },
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
  const actualActionResultBeforeReconciliation = await master
    .applyAction(rid, whitePlayer, [privateWhiteAction, publicWhiteAction])
    .resolveUnwrap();

  const actualPublicStateBeforeReconciliation = await master
    .getPublicState(rid)
    .resolveUnwrap();

  const actualSenderStateBeforeReconciliation = await master
    .getState(rid, whitePlayer)
    .resolveUnwrap();

  const actualReceiverStateBeforeReconciliation = await master
    .getState(rid, blackPlayer)
    .resolveUnwrap();

  const expectedPublicStateBeforeReconciliation = computeCheckedState({
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

  const expectedSenderStateBeforeReconciliation = computeCheckedState({
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

  expect(actualPublicStateBeforeReconciliation).toEqual(
    expectedPublicStateBeforeReconciliation
  );
  expect(actualReceiverStateBeforeReconciliation).toEqual(
    expectedPublicStateBeforeReconciliation
  );
  expect(actualSenderStateBeforeReconciliation).toEqual(
    expectedSenderStateBeforeReconciliation
  );

  expect(actualActionResultBeforeReconciliation).toEqual({
    nextPublic: {
      action: publicWhiteAction,
      checksum: actualPublicStateBeforeReconciliation[1],
    },
    nextPrivate: {
      action: privateWhiteAction,
      checksum: actualSenderStateBeforeReconciliation[1],
    },
    peerActions: {
      type: 'forwardable',
      byClientId: {},
    },
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

  // Black Private Action (also the Reconciliatory Action)
  const actualActionResultAfterReconciliation = await master
    .applyAction(rid, blackPlayer, [privateBlackAction, publicBlackAction])
    .resolveUnwrap();

  const actualPublicStateAfterReconciliation = await master
    .getPublicState(rid)
    .resolveUnwrap();

  const actualSenderStateAfterReconciliation = await master
    .getState(rid, blackPlayer)
    .resolveUnwrap();

  const actualReceiverStateAfterReconciliation = await master
    .getState(rid, whitePlayer)
    .resolveUnwrap();

  const expectedPublicStateAfterReconciliation = computeCheckedState({
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

  expect(actualPublicStateAfterReconciliation).toEqual(
    expectedPublicStateAfterReconciliation
  );

  expect(actualReceiverStateAfterReconciliation).toEqual(
    expectedPublicStateAfterReconciliation
  );
  expect(actualSenderStateAfterReconciliation).toEqual(
    expectedPublicStateAfterReconciliation
  );

  expect(actualActionResultAfterReconciliation).toEqual({
    nextPublic: {
      action: publicBlackAction,
      checksum: expectedPublicStateAfterReconciliation[1],
    },
    nextPrivate: {
      action: privateBlackAction,
      checksum: expectedPublicStateAfterReconciliation[1],
    },
    peerActions: {
      type: 'reconcilable',
      byClientId: {
        [whitePlayer]: {
          actions: [
            {
              ...privateBlackAction,
              isPrivate: undefined,
            },
          ],
          finalChecksum: expectedPublicStateAfterReconciliation[1],
        },
        [blackPlayer]: {
          actions: [
            {
              ...privateWhiteAction,
              isPrivate: undefined,
            },
          ],
          finalChecksum: expectedPublicStateAfterReconciliation[1],
        },
      },
    },
  });
});

// TODO: Add for multiple clients
