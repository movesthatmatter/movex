import { invoke } from 'movex-core-util';
import { MovexResource } from '../lib/MovexResource';
import { computeCheckedState } from '../lib/util';
import gameReducer, { initialGameState } from './util/gameReducer';
import { createMasterEnv } from './util/createMasterEnv';
// require('console-group').install();

describe('Master Client Orchestration', () => {
  test('Public Actions with 2 clients', async () => {
    const masterEnv = createMasterEnv({
      genesisState: initialGameState,
      reducer: gameReducer,
      clientCountOrIdsAsString: ['white', 'black'],
    });

    const [whiteClient, blackClient] = masterEnv.clients;

    const whiteClientXResource = new MovexResource(
      gameReducer,
      masterEnv.getPublic()
    );

    const blackClientXResource = new MovexResource(
      gameReducer,
      masterEnv.getPublic()
    );

    const expectedMasterState = computeCheckedState({
      ...initialGameState,
      count: 5,
    });

    blackClient.onFwdAction((fwd) => {
      const result = blackClientXResource.reconciliateAction(fwd);

      expect(result.ok).toBe(true);
    });

    whiteClientXResource.onDispatched((event) => {
      whiteClient.emitAction(event.action);
    });

    blackClientXResource.onDispatched((event) => {
      blackClient.emitAction(event.action);
    });

    whiteClientXResource.dispatch({
      type: 'change',
      payload: 5,
    });

    expect(masterEnv.getPublic()).toEqual(expectedMasterState);

    expect(whiteClientXResource.get()).toEqual(expectedMasterState);

    // And even the peer client got the next state! Yey!
    expect(blackClientXResource.get()).toEqual(expectedMasterState);
  });

  test('Private with 2 clients/players', () => {
    const masterEnv = createMasterEnv({
      genesisState: initialGameState,
      reducer: gameReducer,
      clientCountOrIdsAsString: ['white', 'black'],
    });

    // Overwrite this to add 3 clients just
    // gameReducer.$canReconcileState = (state) => {
    //   return true;
    // };

    const [whiteClient, blackClient, blueClient] = masterEnv.clients;

    const whiteClientXResource = new MovexResource(
      gameReducer,
      masterEnv.getPublic()
    );
    const blackClientXResource = new MovexResource(
      gameReducer,
      masterEnv.getPublic()
    );

    // Bind the client udpates
    whiteClient.onFwdAction((fwd) => {
      // console.log('[fwding action]', 'white', fwd);
      const result = whiteClientXResource.reconciliateAction(fwd);

      expect(result.ok).toBe(true);
      // TODO: if error the reconcilation needs to happen
    });

    blackClient.onFwdAction((fwd) => {
      const result = blackClientXResource.reconciliateAction(fwd);

      expect(result.ok).toBe(true);
      // TODO: if error the reconcilation needs to happen
    });

    // Bind Action emitter to Master
    whiteClientXResource.onDispatched((event) => {
      whiteClient.emitAction(event.action);
    });

    blackClientXResource.onDispatched((event) => {
      // console.log('[emit action] black', event.action)
      blackClient.emitAction(event.action);
    });

    // White's Turn
    invoke(() => {
      whiteClientXResource.dispatchPrivate(
        {
          type: 'submitMoves',
          payload: {
            color: 'white',
            moves: ['w:E2-E4', 'w:D2-D4'],
          },
          isPrivate: true,
        },
        {
          type: 'readySubmissionState',
          payload: {
            color: 'white',
          },
        }
      );

      const expectedPublicState = computeCheckedState({
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

      // In this case is the same as the public b/c no private changes has been made
      // Black
      const expectedPeerState = expectedPublicState;

      // This is the sender private
      // White
      const expectedSenderState = computeCheckedState({
        ...initialGameState,
        submission: {
          ...initialGameState.submission,
          status: 'partial',
          white: {
            canDraw: false,
            moves: ['w:E2-E4', 'w:D2-D4'],
          },
        },
      });

      // The public action gets set

      // Master gets the new public state
      expect(masterEnv.getPublic()).toEqual(expectedPublicState);

      // Peer gets the new public state
      expect(blackClientXResource.get()).toEqual(expectedPeerState);

      // The Private Action gets set

      // And sender gets the new private state
      expect(whiteClientXResource.get()).toEqual(expectedSenderState);
    });

    // Black's Turn

    invoke(() => {
      blackClientXResource.dispatchPrivate(
        {
          type: 'submitMoves',
          payload: {
            // How not to send the color here. is it even worth it?
            // On argument is that the other player cna manipulat ethings, but if that's the case the whole game engine can be threatened
            // Not worrking ab it for now
            // Can get some token for {me} or smtg like that
            color: 'black',
            moves: ['b:E7-E6'],
          },
          isPrivate: true,
        },
        {
          type: 'readySubmissionState',
          payload: {
            color: 'black',
          },
        }
      );

      const expectedPublicState = computeCheckedState({
        ...initialGameState,
        submission: {
          status: 'partial',
          white: {
            canDraw: false,
            moves: [],
          },
          black: {
            canDraw: false,
            moves: [],
          },
        },
      });

      const expectedReconciliatedPublicState = computeCheckedState({
        ...initialGameState,
        submission: {
          status: 'partial',
          white: {
            canDraw: false,
            moves: ['w:E2-E4', 'w:D2-D4'],
          },
          black: {
            canDraw: false,
            moves: ['b:E7-E6'],
          },
        },
      });

      // White
      const expectedPeerState = computeCheckedState({
        ...initialGameState,
        submission: {
          status: 'partial',
          white: {
            canDraw: false,
            moves: ['w:E2-E4', 'w:D2-D4'],
          },
          black: {
            canDraw: false,
            moves: [],
          },
        },
      });

      // Black
      const expectedSenderState = computeCheckedState({
        ...initialGameState,
        submission: {
          status: 'partial',
          white: {
            canDraw: false,
            moves: [],
          },
          black: {
            canDraw: false,
            moves: ['b:E7-E6'],
          },
        },
      });

      // The public action gets set

      // Master gets the new public state
      expect(masterEnv.getPublic()).toEqual(expectedReconciliatedPublicState);

      // Peer gets the new public state
      // expect(whiteClientXResource.get()).toEqual(expectedPeerState);
      expect(whiteClientXResource.get()).toEqual(expectedReconciliatedPublicState);

      // The Private Action gets set

      // And sender gets the new private state
      // expect(blackClientXResource.get()).toEqual(expectedSenderState);
      expect(blackClientXResource.get()).toEqual(expectedReconciliatedPublicState);
    });
  });
});

// Test with many more peers
