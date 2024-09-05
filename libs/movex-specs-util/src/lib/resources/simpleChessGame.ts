import { Action, MovexReducer } from 'movex-core-util';

// export const SPEED_GAME_TIME_TO_PUSH_MS = 50;

type Player = 'white' | 'black';

export type SimpleChessGameState =
  | {
      status: 'pending';
      winner: undefined;
      lastMoveBy: undefined;
      lastMoveAt: undefined;
      timeLefts: {
        white: number;
        black: number;
      };
    }
  | {
      status: 'ongoing';
      winner: undefined;
      lastMoveBy: Player;
      lastMoveAt: number;
      timeLefts: {
        white: number;
        black: number;
      };
    }
  | {
      status: 'completed';
      winner: Player;
      lastMoveBy: Player;
      lastMoveAt: number;
      timeLefts: {
        white: number;
        black: number;
      };
    };

type SimpleChessGameActions =
  | Action<'move', { at: number; sq: string; by: Player }>
  // Add checktime as well?
  | Action<'unrelatedAction'>;

// let prevAt: number | undefined;
export const calculateTimeLeftAt = ({
  at,
  lastMoveAt,
  turn,
  prevTimeLefts,
}: {
  at: number;
  lastMoveAt: number;
  turn: Player;
  prevTimeLefts: SimpleChessGameState['timeLefts'];
}): SimpleChessGameState['timeLefts'] => {
  const timeSince = at - lastMoveAt;
  const nextTimeLeftForTurn = prevTimeLefts[turn] - timeSince;

  return {
    ...prevTimeLefts,
    [turn]: nextTimeLeftForTurn > 0 ? nextTimeLeftForTurn : 0,
  };
};

export const initialSimpleChessGameState: SimpleChessGameState = {
  status: 'pending',
  winner: undefined,
  lastMoveBy: undefined,
  lastMoveAt: undefined,
  timeLefts: {
    white: 60 * 1000,
    black: 60 * 1000,
  },
};

export const simpleChessGameReducer: MovexReducer<
  SimpleChessGameState,
  SimpleChessGameActions
> = (
  state: SimpleChessGameState = initialSimpleChessGameState,
  action: SimpleChessGameActions
): SimpleChessGameState => {
  if (action.type === 'move') {
    if (state.status === 'completed') {
      return state;
    }

    // Same player cannot move consecutively
    if (state.lastMoveBy === action.payload.by) {
      return state;
    }

    const turn = state.lastMoveBy === 'white' ? 'black' : 'white';

    // const timeSince =
    //   action.payload.at - (state.lastMoveAt || action.payload.at);
    // const nextTimeLeftForTurn = state.timeLefts[turn] - timeSince;

    const nextTimeLefts = state.lastMoveAt
      ? calculateTimeLeftAt({
          at: action.payload.at,
          lastMoveAt: state.lastMoveAt,
          turn,
          prevTimeLefts: state.timeLefts,
        })
      : state.timeLefts;

    // timeout
    if (state.status === 'ongoing' && nextTimeLefts[turn] <= 0) {
      return {
        status: 'completed',
        winner: state.lastMoveBy,
        lastMoveAt: state.lastMoveAt,
        lastMoveBy: state.lastMoveBy,
        timeLefts: nextTimeLefts,
      };
    }

    return {
      status: 'ongoing',
      winner: undefined,
      lastMoveAt: action.payload.at,
      lastMoveBy: action.payload.by,
      timeLefts: nextTimeLefts,
    };
  }

  return state;
};

// How does it move to complete? With the $transfomer

simpleChessGameReducer.$transformState = (state, masterContext) => {
  // const NOW = context.now();

  // Check for game completeion due to timeouts
  if (state.status === 'ongoing') {
    const turn = state.lastMoveBy === 'white' ? 'black' : 'white';

    const nextTimeLefts = calculateTimeLeftAt({
      at: masterContext.requestAt, // TODO: this can take in account the lag as well
      lastMoveAt: state.lastMoveAt,
      prevTimeLefts: state.timeLefts,
      turn,
    });

    // console.log('[reducer].$transformState', JSON.stringify({ nextTimeLefts, masterContext }, null, 2))

    if (nextTimeLefts[turn] <= 0) {
      return {
        status: 'completed',
        winner: state.lastMoveBy,
        lastMoveAt: state.lastMoveAt,
        lastMoveBy: state.lastMoveBy,
        timeLefts: nextTimeLefts,
      };
    }

    // Update the timelefts on each request
    return {
      ...state,
      timeLefts: nextTimeLefts,
    }
  }

  return state;
};
