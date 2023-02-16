import { MovexResource } from '../MovexResource';
import { computeCheckedState, createMovexReducerMap } from '../util';
import { BlackMove, Submission, WhiteMove } from './types';
import { createMasterEnv } from './util';

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
    setSubmissionStatusToReady: (prev, { payload: color }) => {
      if (prev.submission.status === 'partial') {
        return {
          ...prev,
          submission: {
            ...prev.submission,
            [color]: {
              canDraw: false,
              moves: [],
            },
          },
        };
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
        nextChecksum: actualChecksum,
      });

      expect(cSpy).toHaveBeenCalledWith({
        action: {
          type: 'changeCount',
          payload: 2,
        },
        nextChecksum: actualChecksum,
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
      const nextCheckedState = blackClientXResource.applyAction(fwd.action);

      const [_, nextChecksum] = nextCheckedState;

      // This is very important check, ensuring the checksums and states are equal accross all stakeholders
      expect(nextChecksum).toBe(fwd.nextChecksum);
      expect(nextCheckedState).toEqual(expectedMasterState);

      // Do stuff if the acks aren't the same like ask master for reconciliatory updates
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

  // test('with private', () => {
  //   // with the current public implementatino wwe have the issue of not getting private states
  //   // so need a way to get that, the simpler the better

  //   const masterEnv = createMasterEnv<State, ActionsMap>({
  //     genesisState: initialState,
  //     reducerMap: reducer,
  //     clientCountorIds: ['white', 'black'],
  //   });

  //   const [whiteClient, blackClient] = masterEnv.clients;

  //   const whiteClientXResource = new MovexResource<State, ActionsMap>(
  //     reducer,
  //     masterEnv.getPublic()
  //   );

  //   const blackClientXResource = new MovexResource<State, ActionsMap>(
  //     reducer,
  //     masterEnv.getPublic()
  //   );
  // });

  // Test with many more peers
});
