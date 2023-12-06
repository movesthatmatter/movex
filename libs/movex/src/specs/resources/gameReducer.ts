import { Action } from '../../lib/tools/action';
import counterReducer, { CounterActions } from './counterReducer';
import { Move, Submission } from '../util/types';

export type GameState = {
  count: number;
  submission: Submission;
};

export type GameActions =
  | CounterActions
  | Action<
      'submitMoves',
      {
        moves: Move[];
        color: 'white' | 'black';
      }
    >
  | Action<'readySubmissionState', { color: 'white' | 'black' }>;

export const initialGameState: GameState = {
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

const gameReducer = (
  state = initialGameState,
  action: GameActions
): GameState => {
  if (
    action.type === 'change' ||
    action.type === 'decrement' ||
    action.type === 'increment' ||
    action.type === 'incrementBy'
  ) {
    return {
      ...state,
      ...counterReducer(
        {
          count: state.count,
        },
        action
      ),
    };
  }

  if (action.type === 'submitMoves') {
    const prev = state;

    if (prev.submission.status === 'partial') {
      return {
        ...prev,
        submission: {
          ...prev.submission,
          [action.payload.color]: {
            canDraw: false,
            moves: action.payload.moves,
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
        ...(action.payload.color === 'black'
          ? {
              white: {
                canDraw: true,
                moves: [],
              },
              black: {
                canDraw: false,
                moves: action.payload.moves,
              },
            }
          : {
              white: {
                canDraw: false,
                moves: action.payload.moves,
              },
              black: {
                canDraw: true,
                moves: [],
              },
            }),
      },
    };
  }

  if (action.type === 'readySubmissionState') {
    const prev = state;

    if (prev.submission.status === 'partial') {
      const next = {
        ...prev,
        submission: {
          ...prev.submission,
          [action.payload.color]: {
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
          ...(action.payload.color === 'black'
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
  }

  return state;
};

type ReconciledStateReturn<S> = false | true | [true, S];

// TODO: add this
gameReducer.$canReconcileState = (state: GameState) => {
  return (
    state.submission.status === 'partial' &&
    state.submission.white.canDraw === false &&
    state.submission.black.canDraw === false
  );
};

export default gameReducer;
