import { delay, invoke, xinvoke } from '../../core-util';
import { MovexResource } from '../MovexResource';
import { computeCheckedState, createMovexReducerMap } from '../util';
import { BlackMove, Submission, WhiteMove } from './types';
import { createMasterEnv } from './util/createMasterEnv';
require('console-group').install();

describe('Master-Client Orchestration', () => {
  type ActionsMap = {
    changeCount: number;
    submitMoves:
      | {
          color: 'white';
          moves: WhiteMove[];
        }
      | {
          color: 'black';
          moves: BlackMove[];
        };
    setSubmissionStatusToReady: 'white' | 'black';
  };

  type State = {
    count: number;
    submission: Submission;
  };

  const initialState: State = {
    count: 0,
    submission: {
      status: 'none',
      white: {
        canDraw: true,
        moves: [],
      },
      black: {
        canDraw: true,
        moves: [],
      },
    },
  };

  const reducer = createMovexReducerMap<ActionsMap, State>(initialState)({
    changeCount: (prev, { payload }) => ({
      ...prev,
      count: payload,
    }),
    submitMoves: (prev, { payload: { color, moves } }) => {
      if (prev.submission.status === 'partial') {
        return {
          ...prev,
          submission: {
            ...prev.submission,
            [color]: {
              canDraw: false,
              moves,
            },
          },
        };
      }

      if (
        !(
          prev.submission.status === 'none' ||
          prev.submission.status === 'preparing'
        )
      ) {
        return prev;
      }

      return {
        ...prev,
        submission: {
          status: 'partial',
          ...(color === 'black'
            ? {
                white: {
                  canDraw: true,
                  moves: [],
                },
                black: {
                  canDraw: false,
                  moves,
                },
              }
            : {
                white: {
                  canDraw: false,
                  moves,
                },
                black: {
                  canDraw: true,
                  moves: [],
                },
              }),
        },
      };
    },
    setSubmissionStatusToReady: (prev, { payload: color, type }) => {
      if (prev.submission.status === 'partial') {
        const next = {
          ...prev,
          submission: {
            ...prev.submission,
            [color]: {
              canDraw: false,
              moves: [],
            },
          },
        };

        return next;
      }

      if (
        prev.submission.status === 'none' ||
        prev.submission.status === 'preparing'
      ) {
        return {
          ...prev,
          submission: {
            status: 'partial',
            ...(color === 'black'
              ? {
                  white: prev.submission.white,
                  black: {
                    canDraw: false,
                    moves: [],
                  },
                }
              : {
                  black: prev.submission.black,
                  white: {
                    canDraw: false,
                    moves: [],
                  },
                }),
          },
        };
      }

      return prev;
    },
  });

  describe('master env', () => {
    test('gets an ack checksum after action emited', async () => {
      const masterEnv = createMasterEnv<State, ActionsMap>({
        genesisState: initialState,
        reducerMap: reducer,
        clientCountorIds: ['a', 'b', 'c'],
      });

      const [a, b, c] = masterEnv.clients;

      const initialCheckedState = masterEnv.getPublic();
      expect(initialCheckedState).toEqual(computeCheckedState(initialState));

      const actualChecksum = await a.emitAction({
        type: 'changeCount',
        payload: 2,
      });

      expect(actualChecksum).toBeDefined();
      expect(actualChecksum).not.toEqual(initialCheckedState[1]);
    });

    test('the peers get the action forwarded', async () => {
      const masterEnv = createMasterEnv<State, ActionsMap>({
        genesisState: initialState,
        reducerMap: reducer,
        clientCountorIds: ['a', 'b', 'c'],
      });

      const [a, b, c] = masterEnv.clients;

      const aSpy = jest.fn();
      const bSpy = jest.fn();
      const cSpy = jest.fn();

      a.onFwdAction(aSpy);
      b.onFwdAction(bSpy);
      c.onFwdAction(cSpy);

      const actualChecksum = await a.emitAction({
        type: 'changeCount',
        payload: 2,
      });

      expect(bSpy).toHaveBeenCalledWith({
        action: {
          type: 'changeCount',
          payload: 2,
        },
        checksum: actualChecksum,
      });

      expect(cSpy).toHaveBeenCalledWith({
        action: {
          type: 'changeCount',
          payload: 2,
        },
        checksum: actualChecksum,
      });

      expect(aSpy).not.toHaveBeenCalled();
    });

    test('the peers get the state updated', async () => {
      const masterEnv = createMasterEnv<State, ActionsMap>({
        genesisState: initialState,
        reducerMap: reducer,
        clientCountorIds: ['a', 'b', 'c'],
      });

      const [a, b, c] = masterEnv.clients;

      const aSpy = jest.fn();
      const bSpy = jest.fn();
      const cSpy = jest.fn();

      a.subscribeToNetworkExpensiveMasterUpdates(aSpy);
      b.subscribeToNetworkExpensiveMasterUpdates(bSpy);
      c.subscribeToNetworkExpensiveMasterUpdates(cSpy);

      const actualChecksum = await a.emitAction({
        type: 'changeCount',
        payload: 2,
      });

      const expectedState: State = {
        ...initialState,
        count: 2,
      };

      const expected = computeCheckedState(expectedState);

      expect(actualChecksum).toBe(expected[1]);

      expect(bSpy).toHaveBeenCalledWith(expected);
      expect(cSpy).toHaveBeenCalledWith(expected);
      expect(aSpy).not.toHaveBeenCalled();
    });

    // test('')
  });

  test('Public Actions with 2 clients', async () => {
    const masterEnv = createMasterEnv<State, ActionsMap>({
      genesisState: initialState,
      reducerMap: reducer,
      clientCountorIds: ['white', 'black'],
    });

    const [whiteClient, blackClient] = masterEnv.clients;

    const whiteClientXResource = new MovexResource<State, ActionsMap>(
      reducer,
      masterEnv.getPublic()
    );

    const blackClientXResource = new MovexResource<State, ActionsMap>(
      reducer,
      masterEnv.getPublic()
    );

    const expectedMasterState = computeCheckedState({
      ...initialState,
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
      type: 'changeCount',
      payload: 5,
    });

    expect(masterEnv.getPublic()).toEqual(expectedMasterState);

    expect(whiteClientXResource.get()).toEqual(expectedMasterState);

    // And even the peer client got the next state! Yey!
    expect(blackClientXResource.get()).toEqual(expectedMasterState);
  });

  test('with private', () => {
    const masterEnv = createMasterEnv<State, ActionsMap>({
      genesisState: initialState,
      reducerMap: reducer,
      clientCountorIds: ['white', 'black'],
    });

    const [whiteClient, blackClient] = masterEnv.clients;

    const whiteClientXResource = new MovexResource<State, ActionsMap>(
      reducer,
      masterEnv.getPublic()
    );
    const blackClientXResource = new MovexResource<State, ActionsMap>(
      reducer,
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
      whiteClientXResource.dispatch([
        {
          type: 'submitMoves',
          payload: {
            color: 'white',
            moves: ['w:E2-E4', 'w:D2-D4'],
          },
          isPrivate: true,
        },
        {
          type: 'setSubmissionStatusToReady',
          payload: 'white',
        },
      ]);

      const expectedPublicState = computeCheckedState({
        ...initialState,
        submission: {
          ...initialState.submission,
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
        ...initialState,
        submission: {
          ...initialState.submission,
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
      blackClientXResource.dispatch([
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
          type: 'setSubmissionStatusToReady',
          payload: 'black',
        },
      ]);

      const expectedPublicState = computeCheckedState({
        ...initialState,
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

      // White
      const expectedPeerState = computeCheckedState({
        ...initialState,
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
        ...initialState,
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
      expect(masterEnv.getPublic()).toEqual(expectedPublicState);

      // Peer gets the new public state
      expect(whiteClientXResource.get()).toEqual(expectedPeerState);

      // The Private Action gets set

      // And sender gets the new private state
      expect(blackClientXResource.get()).toEqual(expectedSenderState);
    });
  });

  // Test with many more peers
});
