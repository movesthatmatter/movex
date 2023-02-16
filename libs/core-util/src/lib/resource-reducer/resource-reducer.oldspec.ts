import { ClientResourceShape, ResourceShape } from '../core-types';
import { delay, noop, orThrow } from '../core-util';
import { Observable } from '../core-util/Observable';
import {
  createResourceReducerMap,
  createDispatcher,
  applyReducerAction,
} from './resource-reducer';
import { createClientEnvironment, createMasterEnvironment } from './spec-util';
import { ResourceAndChecksum } from './types';
import { hashObject } from './util';
require('console-group').install();

type WhiteMove = `w:${string}-${string}`;
type BlackMove = `w:${string}-${string}`;

type Turn = [WhiteMove[], BlackMove[]] | [BlackMove[], WhiteMove[]];

type GameState = {
  history: Turn[];
  currentSoundtrack:
    | 'Michael Jackson'
    | 'Bob Marley'
    | 'Bob Dylan'
    | 'Nirvana'
    | 'Led Zeppelin';
  submission: //  TODO: This needs to be better

  | {
        status: 'none';
        white: {
          canDraw: true;
          moves: WhiteMove[];
        };
        black: {
          canDraw: true;
          moves: BlackMove[];
        };
      }
    | {
        status: 'preparing';
        white: {
          canDraw: true;
          moves: WhiteMove[];
        };
        black: {
          canDraw: true;
          moves: BlackMove[];
        };
      }
    // How to write this state to be able to work with the private state and public state
    // | {
    //     status: 'partial:revealed';
    //     white: {
    //       canDraw: true;
    //       moves: undefined;
    //     };
    //     black: {
    //       canDraw: false;
    //       moves: BlackMove[];
    //     };
    //   }
    // | {
    //     status: 'partial:revealed';
    //     white: {
    //       canDraw: false;
    //       moves: WhiteMove[];
    //     };
    //     black: {
    //       canDraw: true;
    //       moves: undefined;
    //     };
    //   }
    // |
    | {
        status: 'partial';
        white: {
          canDraw: true;
          moves: WhiteMove[];
        };
        black: {
          canDraw: false;
          moves: BlackMove[]; // hidden
        };
      }
    | {
        status: 'partial';
        white: {
          canDraw: false;
          moves: WhiteMove[]; // hidden
        };
        black: {
          canDraw: true;
          moves: BlackMove[];
        };
      }
    | {
        status: 'reconciled';
        white: {
          canDraw: false;
          moves: WhiteMove[];
        };
        black: {
          canDraw: false;
          moves: BlackMove[];
        };
      };
};
type GameResource = ResourceShape<'game', GameState>;

type GameActionsMap = {
  changeSoundtrack: GameState['currentSoundtrack'];
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

type Counter = {
  val: number;
};

type CounterActionsMap = {
  increment: undefined;
  incrementBy: number;
};

type CounterResource = ClientResourceShape<'counter', Counter>;

describe('Client Dispatch', () => {
  it('basic dispatch', async () => {
    const counterResource: CounterResource = {
      type: 'counter',
      id: '1',
      item: {
        id: '1',
        val: 0,
      },
    };

    const reducerMap = createResourceReducerMap<
      CounterResource,
      CounterActionsMap
    >()({
      increment: (prev) => {
        return {
          ...prev,
          val: prev.val + 1,
        };
      },
    });

    let actual: CounterResource['item'] | undefined = undefined;

    // TODO I would like to be able not to pass in the generics again, but tohe able to infer them!
    const dispatch = createDispatcher<CounterResource, CounterActionsMap>(
      //  delay(100).then(() => counterResource),
      new Observable({
        resource: counterResource,
        checksum: hashObject(counterResource),
      }),
      reducerMap,
      {
        onDispatched: ({ state: nextState }) => {
          actual = nextState;
        },
      }
    );

    dispatch({ type: 'increment', payload: undefined });

    await delay(101);

    expect(actual).toEqual({
      ...counterResource.item,
      val: 1,
    });

    dispatch({ type: 'increment', payload: undefined });
    dispatch({ type: 'increment', payload: undefined });

    expect(actual).toEqual({
      ...counterResource.item,
      val: 3,
    });
  });
});

describe('Master - Client Orchestration', () => {
  // create the reducer

  const gameResource: GameResource = {
    type: 'game',
    id: '1',
    item: {
      id: '1',
      currentSoundtrack: 'Bob Dylan',
      history: [],
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
    },
    subscribers: {},
  };

  const reducerCreator = createResourceReducerMap<
    GameResource,
    GameActionsMap
  >();

  const reducerMap = reducerCreator({
    changeSoundtrack: (prev, { payload: currentSoundtrack }) => {
      return {
        ...prev,
        currentSoundtrack,
      };
    },
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

      // return {
      //   ...prev,
      //   submission: {
      //     status: 'partial',

      //     // ...(color === 'black'
      //     //   ? {
      //     //       white: prev.submission.white,
      //     //       black: {
      //     //         canDraw: false,
      //     //         moves: [],
      //     //       },
      //     //     }
      //     //   : {
      //     //       white: {
      //     //         canDraw: false,
      //     //         moves: [],
      //     //       },
      //     //       black: prev.submission.black,
      //     //     }),
      //   },
      // };
    },
    $canReconcile: (state) => {
      return false;
    },
    // $canReconcile: () => {
    //   return false;
    // }
  });

  test('works with public actions', async () => {
    // Orchestration
    // let serverActual: GameState | undefined;
    // let serverActualChecksum: string | undefined;

    // let clientActual: GameState | undefined;
    // let clientActualChecksum: string | undefined;

    // const $resource = new Observable({
    //   resource: gameResource,
    //   checksum: hashObject(gameResource),
    // });

    // run it as client
    // const clientDispatch = createDispatcher<GameResource, GameActionsMap>(
    //   // delay(NETWORK_LAG_MS).then(() => gameResource),
    //   $resource,
    //   reducerMap,
    //   {
    //     // This should use the client env
    //     onDispatched: async (next, prev, action) => {
    //       // Save the client right away
    //       clientActual = next.state;
    //       clientActualChecksum = next.checksum;

    //       // This simulates what happen in client-sdk

    //       // Simulate network lag
    //       await delay(NETWORK_LAG_MS);

    //       // Simulate the backend
    //       serverActualChecksum = await applyReducerAction<
    //         GameActionsMap,
    //         GameResource
    //       >(
    //         $resource,
    //         reducerMap
    //       )(action)
    //         .map(([nextMasterState, nextMasterChecksum]) => {
    //           // delay(100).then(() => {
    //           serverActual = nextMasterState;

    //           // Return the acknowledgement checksum

    //           return nextMasterChecksum;
    //         })
    //         .resolveUnwrapOr(undefined);
    //     },
    //   }
    // );

    const NETWORK_LAG_MS = 100;

    const masterEnv = createMasterEnvironment<GameResource, GameActionsMap>({
      clientCount: 2,
      reducerMap,
      resource: gameResource,
    });

    const [whiteClient, blackClient] = masterEnv.clients.map((client) =>
      createClientEnvironment<GameResource, GameActionsMap>(
        client,
        masterEnv.getResourceObj(client.clientId),
        // client.$resourceAndChecksum,
        reducerMap,
        {
          // onDispatched: () => {},
          NETWORK_LAG_MS: NETWORK_LAG_MS / 2,
        }
      )
    );

    whiteClient.dispatch({ type: 'changeSoundtrack', payload: 'Led Zeppelin' });

    // Simulate network download lag
    await delay(NETWORK_LAG_MS + 1);

    expect(whiteClient.getState()).toEqual({
      ...gameResource.item,
      currentSoundtrack: 'Led Zeppelin',
    });

    // expect(whiteClient.getState()).toEqual(
    //   masterEnv.getPublicResourceObj().resource.item
    // );
    // expect(masterEnv.getPublicResourceObj().checksum).toBe(
    //   whiteClient.getChecksum()
    // );

    // blackClient.dispatch({ type: 'changeSoundtrack', payload: 'Bob Marley' });

    // // Simulate running it as master and the network download lag
    // await delay(NETWORK_LAG_MS + 1);

    // expect(blackClient.getState()).toEqual({
    //   ...gameResource.item,
    //   currentSoundtrack: 'Bob Marley',
    // });
    // test that the processed next state are the same
  });

  // TODO Test when checksums aren't the same to do a whole refetch
  // test('works with mismatching checksums for various reasons', () => {});

  // test('reconciles mismatching checksums from one client being faster than other', () => {
  //   // Scenario
  //   // Client A dispatches NOW
  //   // Client B dispatches after client A
  //   //   But client B requests arrives BEFORE client A
  //   // What are the possible issues with this and how to navigate it?
  // });

  test.skip('works with private actions', async () => {
    console.log = noop;
    console.group = noop;

    // let actualWhiteClientState: GameState | undefined;
    // let actualWhiteClientChecksum: string | undefined;

    // let actualBlackClientState: GameState | undefined;
    // let actualBlackClientChecksum: string | undefined;

    const NETWORK_LAG_MS = 100;

    const masterEnv = createMasterEnvironment<GameResource, GameActionsMap>({
      clientCount: 2,
      reducerMap,
      resource: gameResource,
    });

    const [whiteClient, blackClient] = masterEnv.clients.map((client) =>
      createClientEnvironment<GameResource, GameActionsMap>(
        client,
        masterEnv.getResourceObj(client.clientId),
        // client.$resourceAndChecksum,
        reducerMap,
        {
          // onDispatched: () => {},
          NETWORK_LAG_MS: NETWORK_LAG_MS / 2,
        }
      )
    );

    // public again
    // whiteClient.dispatch({
    //   type: 'changeSoundtrack',
    //   payload: 'Bob Marley',
    // });

    // await delay(NETWORK_LAG_MS);

    // expect(whiteClient.getState()).toEqual({
    //   ...gameResource.item,
    //   currentSoundtrack: 'Bob Marley',
    // });

    // expect(masterEnv.getPublicResourceObj().resource.item).toEqual({
    //   ...gameResource.item,
    //   currentSoundtrack: 'Bob Marley',
    // });

    whiteClient.dispatch([
      {
        type: 'submitMoves',
        payload: {
          color: 'white',
          moves: ['w:E2-E4', 'w:F2-F4'],
        },
        isPrivate: true,
      },
      // This is the punlic action
      {
        type: 'setSubmissionStatusToReady',
        payload: 'white',
      },
    ]);

    // Simulate network download lag
    await delay(NETWORK_LAG_MS);

    // Client after Private Action
    expect(whiteClient.getState()).toEqual({
      ...gameResource.item,
      // currentSoundtrack: 'Bob Marley',
      submission: {
        status: 'partial',
        white: {
          canDraw: false,
          moves: ['w:E2-E4', 'w:F2-F4'],
        },
        black: {
          canDraw: true,
          moves: [],
        },
      },
    });

    // Master after Public Action
    expect(masterEnv.getPublicResourceObj().resource.item).toEqual({
      ...gameResource.item,
      // currentSoundtrack: 'Bob Marley',
      submission: {
        ...gameResource.item.submission,
        status: 'partial',
        white: {
          canDraw: false,
          moves: [],
        },
      },
    });

    expect(
      masterEnv.getPrivateResourceObj(whiteClient.clientId).resource.item
    ).toEqual(whiteClient.getState());

    expect(masterEnv.getPrivateResourceObj(whiteClient.clientId).checksum).toBe(
      whiteClient.getChecksum()
    );

    expect(masterEnv.getPublicResourceObj().checksum).not.toBe(
      whiteClient.getChecksum()
    );

    // Wait for the other player to submit
    await delay(NETWORK_LAG_MS + 23);

    blackClient.dispatch([
      {
        type: 'submitMoves',
        payload: {
          color: 'black',
          moves: ['w:E7-E6', 'w:F7-F6'],
        },
        isPrivate: true,
      },
      // This is the public action
      {
        type: 'setSubmissionStatusToReady',
        payload: 'black',
      },
    ]);

    await delay(NETWORK_LAG_MS * 2 + 1);

    // console.debug('here xx', blackClient.getState());

    expect(blackClient.getState()).toEqual({
      ...gameResource.item,
      submission: {
        status: 'partial',
        black: {
          canDraw: false,
          moves: ['w:E7-E6', 'w:F7-F6'],
        },
        white: {
          // TODO: here I believe it should already be false b/c he already submitted the public
          // But this is the reducer I believe overwriting this!
          canDraw: false,
          moves: [],
        },
      },
    });

    // TODO: Uncomment below

    // expect(privateServerActual).toEqual({
    //   ...gameResource.item,
    //   submission: {
    //     status: 'partial',
    //     white: { //
    //       canDraw: true,
    //       moves: [],
    //     },
    //     black: {
    //       canDraw: false,
    //       moves: ['w:E7-E6', 'w:F7-F6'],
    //     },
    //   },
    // });
  });
});
