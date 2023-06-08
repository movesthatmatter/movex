import { Actions } from './actions';
import { State, initialState } from './state';
import { getRPSWinner, toOppositeLabel } from './utils';

export const reducer = (state = initialState, action: Actions): State => {
  if (action.type === 'playAgain') {
    return {
      ...state,
      players: state.players,
      winner: null,
      submissions: {
        playerA: null,
        playerB: null,
      },
    };
  }

  if (action.type === 'addPlayer') {
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
          id: action.payload.id,
        },
      },
    };
  }

  if (action.type === 'submit') {
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
      };
    } else {
      // final submission: game gets completed
      const nextSubmission = {
        ...state.submissions,
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
        submissions: nextSubmission,
        winner: nextWinner as any,
      };
    }
  } else if (action.type === 'setReadySubmission') {
    // If game is completed
    if (state.winner !== null) {
      return state;
    }

    const nextSubmission = {
      ...state.submissions,
      [action.payload.playerLabel]: {
        play: '$SECRET',
      },
    };

    return {
      ...state,
      submissions: nextSubmission,
    };
  }

  return state;
};

reducer.$canReconcileState = (state: State) =>
  state.submissions.playerA !== null && state.submissions.playerB !== null;

export default reducer;
