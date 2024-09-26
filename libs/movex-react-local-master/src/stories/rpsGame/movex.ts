// import { Action } from "movex";
// import { MovexClient } from "movex-core-util";

import { Action, MovexClient } from 'movex-core-util';

export type PlayerId = MovexClient["id"];
export type Color = string;

export type RPS = "rock" | "paper" | "scissors";

export const playerLabels = ["playerA", "playerB"] as const;
export type PlayerLabel = "playerA" | "playerB";

export type State = Game;

export const initialState: State = {
  players: {
    playerA: null,
    playerB: null
  },
  winner: null,
  submissions: {
    playerA: null,
    playerB: null
  }
};

export const selectAvailableLabels = (state: State): PlayerLabel[] => {
  return playerLabels.filter((l) => state.players[l] === null);
};

export function toOppositeLabel<L extends PlayerLabel>(
  c: L
): L extends "playerA" ? "playerB" : "playerA";
export function toOppositeLabel<L extends PlayerLabel>(l: L) {
  return l === "playerA" ? "playerB" : "playerA";
}

export const getRPSWinner = ([a, b]: [
  RPS | "$SECRET" | null | undefined,
  RPS | "$SECRET" | null | undefined
]): RPS | "1/2" | null => {
  if (!a || a === "$SECRET" || !b || b === "$SECRET") {
    return null;
  }

  if (a === b) {
    return "1/2";
  }

  if (a === "paper") {
    if (b === "rock") {
      return a;
    }

    return b;
  } else if (a === "rock") {
    if (b === "scissors") {
      return a;
    }

    return b;
  } else if (b === "paper") {
    return a;
  }

  return b;
};

type Player = {
  id: PlayerId;
  label: PlayerLabel;
};

type RevealedSubmission = {
  play: RPS;
};

type SecretSubmission = {
  play: "$SECRET";
};

export type Submission = RevealedSubmission | SecretSubmission;

export type GameInProgress = {
  players: {
    playerA: Player | null;
    playerB: Player | null;
  };
  submissions: {
    playerA: Submission | null;
    playerB: Submission | null;
  };
  winner: null;
};

export type GameCompleted = {
  players: {
    playerA: Player;
    playerB: Player;
  };
  submissions: {
    playerA: Submission;
    playerB: Submission;
  };
  winner: RPS | "1/2";
};

export type Game = GameInProgress | GameCompleted;

export type Actions =
  | Action<
      "addPlayer",
      {
        id: PlayerId;
        playerLabel: PlayerLabel;
        atTimestamp: number;
      }
    >
  | Action<"playAgain">
  | Action<
      "submit",
      {
        playerLabel: PlayerLabel;
        rps: RPS;
      }
    >
  | Action<
      "setReadySubmission",
      {
        playerLabel: PlayerLabel;
      }
    >;

export const reducer = (state = initialState, action: Actions): State => {
  if (action.type === "playAgain") {
    return {
      ...state,
      players: state.players,
      winner: null,
      submissions: {
        playerA: null,
        playerB: null
      }
    };
  }

  if (action.type === "addPlayer") {
    // If already taken return
    if (state.players[action.payload.playerLabel] !== null) {
      return state;
    }

    return {
      ...state,

      players: {
        // TODO: This is just stupid needing a recast b/c it cannot determine if the game is completed or inProgress, but at this point I care not
        ...(state.players as any),
        [action.payload.playerLabel]: {
          label: action.payload.playerLabel,
          id: action.payload.id
        }
      }
    };
  }

  if (action.type === "submit") {
    // If game is completed
    if (state.winner !== null) {
      return state;
    }

    const oppositeLabel = toOppositeLabel(action.payload.playerLabel);

    // 1st submission
    if (state.submissions[oppositeLabel] === null) {
      return {
        ...state,
        submissions: {
          ...(action.payload.playerLabel === "playerA"
            ? {
                playerA: {
                  play: action.payload.rps
                },
                playerB: null
              }
            : {
                playerB: {
                  play: action.payload.rps
                },
                playerA: null
              })
        }
      };
    } else {
      // final submission: game gets completed
      const nextSubmission = {
        ...state.submissions,
        [action.payload.playerLabel]: {
          play: action.payload.rps
        }
      };

      const nextWinner = getRPSWinner([
        nextSubmission.playerA?.play,
        nextSubmission.playerB?.play
      ]);

      return {
        ...state,
        submissions: nextSubmission,
        winner: nextWinner as any
      };
    }
  } else if (action.type === "setReadySubmission") {
    // If game is completed
    if (state.winner !== null) {
      return state;
    }

    const nextSubmission = {
      ...state.submissions,
      [action.payload.playerLabel]: {
        play: "$SECRET"
      }
    };

    return {
      ...state,
      submissions: nextSubmission
    };
  }

  return state;
};

reducer.$canReconcileState = (state: State) =>
  state.submissions.playerA !== null && state.submissions.playerB !== null;

export default reducer;
