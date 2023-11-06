import { MovexClient, Action } from  'movex-core-util';

type PlayerId = MovexClient['id'];
type Color = string;

type RPS = 'rock' | 'paper' | 'scissors';

const playerLabels = ['playerA', 'playerB'] as const;
type PlayerLabel = 'playerA' | 'playerB';

export function toOppositeLabel<L extends PlayerLabel>(
  c: L
): L extends 'playerA' ? 'playerB' : 'playerA';
export function toOppositeLabel<L extends PlayerLabel>(l: L) {
  return l === 'playerA' ? 'playerB' : 'playerA';
}

type Player = {
  id: PlayerId;
  label: PlayerLabel;
  // color: Color;
  // submitted: boolean;
};

type RevealedSubmission = {
  // player: Player;
  play: RPS;
};

type SecretSubmission = {
  play: '$SECRET';
  // player: Player;
};

// const toPppositeLabel = (l: ) =>

type Submission = RevealedSubmission | SecretSubmission;

type GameInProgress = {
  players: {
    playerA: Player | null;
    playerB: Player | null;
  };
  // submissions: [] | [Submission] | [Submission, Submission];
  submissions: {
    playerA: Submission | null;
    playerB: Submission | null;
  };
  winner: null;
};

type GameCompleted = {
  players: {
    playerA: Player;
    playerB: Player;
  };
  submissions: {
    playerA: Submission;
    playerB: Submission;
  };
  winner: RPS | '1/2';
};

type Game = GameInProgress | GameCompleted;

export type State = {
  currentGame: Game;
  gameHistory: Game[];
};

export const rpsInitialState: State = {
  currentGame: {
    players: {
      playerA: null,
      playerB: null,
    },
    winner: null,
    submissions: {
      playerA: null,
      playerB: null,
    },
  },
  gameHistory: [],
};

export type Actions =
  | Action<
      'addPlayer',
      {
        id: PlayerId;
        playerLabel: PlayerLabel;
      }
    >
  // | Action<
  //     'removePlayer',
  //     {
  //       id: PlayerId;
  //       atTimestamp: number;
  //     }
  //   >
  | Action<
      'submit',
      {
        playerLabel: PlayerLabel;
        rps: RPS;
      }
    >
  | Action<
      'setReadySubmission',
      {
        playerLabel: PlayerLabel;
      }
    >
  | Action<'playAgain'>;

export const rpsReducer = (
  state = rpsInitialState as State,
  action: Actions
): State => {
  if (action.type === 'playAgain') {
    return {
      ...state,
      currentGame: {
        players: state.currentGame.players,
        winner: null,
        submissions: {
          playerA: null,
          playerB: null,
        },
      },
    };
  }

  if (action.type === 'addPlayer') {
    // If already taken return
    if (state.currentGame.players[action.payload.playerLabel] !== null) {
      return state;
    }

    return {
      ...state,
      currentGame: {
        ...state.currentGame,
        players: {
          // TODO: This is just stupid needing a recast b/c it cannot determine if the game is completed or inProgress, but at this point I care not
          ...(state.currentGame.players as any),
          [action.payload.playerLabel]: {
            label: action.payload.playerLabel,
            id: action.payload.id,
          },
        },
      },
    };
  }

  if (action.type === 'submit') {
    // If game is completed
    if (state.currentGame.winner !== null) {
      return state;
    }

    const oppositeLabel = toOppositeLabel(action.payload.playerLabel);

    // 1st submission
    if (state.currentGame.submissions[oppositeLabel] === null) {
      return {
        ...state,
        currentGame: {
          ...state.currentGame,
          submissions: {
            ...(action.payload.playerLabel === 'playerA'
              ? {
                  playerA: {
                    play: action.payload.rps,
                  },
                  playerB: null,
                }
              : {
                  playerB: {
                    play: action.payload.rps,
                  },
                  playerA: null,
                }),
          },
        },
      };
    } else {
      // final submission: game gets completed

      const nextSubmission = {
        ...state.currentGame.submissions,
        [action.payload.playerLabel]: {
          play: action.payload.rps,
        },
      };

      const nextWinner = getRPSWinner([
        nextSubmission.playerA?.play,
        nextSubmission.playerB?.play,
      ]);

      return {
        ...state,
        currentGame: {
          ...state.currentGame,
          submissions: nextSubmission,
          winner: nextWinner as any,
        },
      };

      // return {
      //   ...state,
      //   currentGame: {
      //     submissions: nextSubmissions,
      //     winner: nextSubmissions[nextWinner].play,
      //   },
      // };
    }
  } else if (action.type === 'setReadySubmission') {
    // If game is completed
    if (state.currentGame.winner !== null) {
      return state;
    }

    // if (
    //   state.currentGame.submissions.length === 0 ||
    //   state.currentGame.submissions.length === 1
    // ) {
    const nextSubmission = {
      ...state.currentGame.submissions,
      [action.payload.playerLabel]: {
        play: '$SECRET',
      },
    };

    return {
      ...state,
      currentGame: {
        ...state.currentGame,
        submissions: nextSubmission,
      },
    };
    // }
  }

  return state;
};

const getRPSWinner = ([a, b]: [
  RPS | '$SECRET' | null | undefined,
  RPS | '$SECRET' | null | undefined
]): RPS | '1/2' | null => {
  if (!a || a === '$SECRET' || !b || b === '$SECRET') {
    return null;
  }

  if (a === b) {
    return '1/2';
  }

  if (a === 'paper') {
    if (b === 'rock') {
      return a;
    }

    return b;
  } else if (a === 'rock') {
    if (b === 'scissors') {
      return a;
    }

    return b;
  }

  // (a === 'scissors') {
  else if (b === 'paper') {
    return a;
  }

  return b;
};

export const selectAvailableLabels = (state: State): PlayerLabel[] => {
  return playerLabels.filter((l) => state.currentGame.players[l] === null);
};

rpsReducer.$canReconcileState = (state: State) => {
  // return false;
  return (
    state.currentGame.submissions.playerA !== null &&
    state.currentGame.submissions.playerB !== null
  );
};

export default rpsReducer;

// export default chatReducer;
