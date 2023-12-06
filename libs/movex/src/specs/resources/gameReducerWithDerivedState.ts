import { isObject, keyInObject } from 'movex-core-util';
import { Action } from '../../lib/tools/action';
import { Move } from '../util/types';

export type SubmissionDrawnItem = {
  canDraw: false;
  moves: Move[];
};

export type SubmissionNotDrawnItem = {
  canDraw: true;
  moves: null;
};

export type SubmissionItem = SubmissionDrawnItem | SubmissionNotDrawnItem;

export type RawSubmission = {
  white: SubmissionItem;
  black: SubmissionItem;
};

export type RawGameState = {
  submission: RawSubmission;
};

export type GameActions =
  | Action<
      'submitMoves',
      {
        moves: Move[];
        color: 'white' | 'black';
      }
    >
  | Action<'readySubmissionState', { color: 'white' | 'black' }>;

export const initialRawGameStateWithDerivedState: RawGameState = {
  submission: {
    white: {
      canDraw: true,
      moves: null,
    },
    black: {
      canDraw: true,
      moves: null,
    },
  },
};

const gameReducerWithDerivedState = (
  prev = initialRawGameStateWithDerivedState,
  action: GameActions
): RawGameState => {
  if (action.type === 'submitMoves') {
    // if (prev.submission[action.payload.color].canDraw) {
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
    // }
  } else if (action.type === 'readySubmissionState') {
    // if (prev.submission[action.payload.color].canDraw) {
    return {
      ...prev,
      submission: {
        ...prev.submission,
        [action.payload.color]: {
          canDraw: false,
          moves: [],
        },
      },
    };
    // }
  }

  return prev;
};

// TODO: add this
gameReducerWithDerivedState.$canReconcileState = (
  state: RawGameState
): boolean => {
  return (
    // TODO: In theory, the status of the submission is redundant b/c it can be derived from the canDraw states, can't it?
    //  And if that's not enough because boolean could not satifsy every possibilities, than then each color can have it's own submission
    //  status. In which case then it will be really derivable, if still needed and thus not needed to be part of the reducer
    // Or the reducer can have a getDerived state or something like that a static method that runs after each action or after each public/private/reconciliatoryCheck
    //  can get as specific as needed although I believe it's not even needed, as the state can be represented at this level as simply as possible
    // state.submission.status === 'partial' &&
    state.submission.white.canDraw === false &&
    !!state.submission.white.moves &&
    state.submission.black.canDraw === false &&
    !!state.submission.black.moves
  );
};

// type EnhancedGameState = {
//   submission: GameState['submission'];
// };

/**
 * This is optional, and it's only used to enhance the state properties. For example a status that can be derived
 *  from the state properties, doesn't necessarily need to be hardcoded. The reason for that could've been simplicity, but that could still be
 * retained at the type level only. Think about t as 2 states, one that gets used in the reducer and gets persisted and one that is derived from it
 *
 * What this would fix is the reconciliation issues between private actions and public state, beause if this derivable fields are used then it's
 *  impsosible (without some incredible gymnasitics probably) to determine which state update is more relevant –the private (which is used now) merged
 *  on top of the next public, or use some sort of order of input. Even in that case if the public changes, and it changes with multiple fields at the same time
 *  but only some need to be merged, than how to decide which ones without some crazy marking or complex heuristcs.
 *
 * For now, my intuition says this strategy seems to work the best:
 * 1. Structure the state to be as minimal as possible, each paired action (private/public) to only change the same ones and as few fields as possible
 * 2. If that doesn't suffice the $deriveState can be used to enhance the exported state
 *
 * Update. The derived state isn't really needed at the reducer level, but it could be something at MovexLevel, passing a transformer function so it can easily
 * read the output and work with that. On the other hand, that might not be needed as I've discovered (with only 1 test so far) that if the state is simple enough,
 * meaning that PrivateActionPair changes the same field, then it should be an issue b/c the private will always replace the temporary public. That's the main thing
 * to keep in mind –whatever gets set by the public state will be replaced by its paired private action. It's only meant to be a temporeary placeholder
 * // Yeaaah, so think about the public pair action as a palceholder, replaceable by the private action upon reconciliation/revelation, with the private having authority
 * over replacing it. In theory the public could affect other parts of the state (more permanent, or untouched by the private action) but it probsably shouldn't
 *
 * @param state
 * @returns
 */
// gameReducerWithDerivedState.$deriveState = (
//   state: RawGameState
// ): EnhancedGameState => {
//   const { submission } = state;
//   // This could be replaced by a type guard to make it easier to write
//   // b/c for whatever reason it still fails even though the checks shouldn't allow it to fail
//   if (isReconcilableSubmission(submission)) {
//     return {
//       ...state,
//       submission: {
//         status: 'reconciled',
//         ...submission,
//       },
//     };
//   }

//   if (isPartialSubmission(submission)) {
//     const nextSubmission = {
//       status: 'partial',

//       white: submission.white.canDraw
//         ? {
//             canDraw: true,
//             moves: [],
//           }
//         : {
//             canDraw: false,
//             moves: submission.white.moves,
//           },

//       black: submission.black.canDraw
//         ? {
//             canDraw: true,
//             moves: [],
//           }
//         : {
//             canDraw: false,
//             moves: submission.black.moves,
//           },
//     } as any; // TODO: Fix this

//     return {
//       ...state,
//       submission: nextSubmission,
//     };
//   }

//   // None
//   return {
//     ...state,
//     submission: {
//       status: 'none',
//       white: {
//         canDraw: true,
//         moves: [],
//       },
//       black: {
//         canDraw: true,
//         moves: [],
//       },
//     },
//   };
// };

function isSubmissionDrawnItem(r: unknown): r is SubmissionDrawnItem {
  return isSubmissionItem(r) && r.canDraw === false && !!r.moves;
}

function isSubmissionUndrawnItem(r: unknown): r is SubmissionNotDrawnItem {
  return isSubmissionItem(r) && !isSubmissionDrawnItem(r);
}

type ReconcilableSubmission = {
  white: {
    canDraw: false;
    moves: Move[];
  };
  black: {
    canDraw: false;
    moves: Move[];
  };
};

function isSubmissionItem(r: unknown): r is SubmissionItem {
  return isObject(r) && keyInObject(r, 'moves') && keyInObject(r, 'canDraw');
}

function isReconcilableSubmission(r: unknown): r is ReconcilableSubmission {
  return (
    isSubmission(r) &&
    isSubmissionDrawnItem(r.black) &&
    isSubmissionDrawnItem(r.white)
  );
}

type NoSubmission = {
  white: {
    canDraw: true;
    moves: undefined;
  };
  black: {
    canDraw: true;
    moves: undefined;
  };
};

type PartialSubmission =
  | {
      white: SubmissionDrawnItem;
      black: SubmissionNotDrawnItem;
    }
  | {
      black: SubmissionDrawnItem;
      white: SubmissionNotDrawnItem;
    };

function isSubmission(r: unknown): r is RawSubmission {
  return (
    isObject(r) &&
    keyInObject(r, 'black') &&
    keyInObject(r, 'white') &&
    isSubmissionItem(r.black) &&
    isSubmissionItem(r.white)
  );
}

function isNoSubmission(r: unknown): r is NoSubmission {
  return (
    isSubmission(r) &&
    r.black.canDraw === true &&
    r.black.moves === undefined &&
    r.white.canDraw === true &&
    r.white.moves === undefined
  );
}

function isPartialSubmission(r: unknown): r is PartialSubmission {
  return (
    isSubmission(r) &&
    ((isSubmissionDrawnItem(r.white) && isSubmissionUndrawnItem(r.black)) ||
      (isSubmissionDrawnItem(r.black) && isSubmissionUndrawnItem(r.white)))
  );
}

export default gameReducerWithDerivedState;
