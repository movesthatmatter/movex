import { Action, MovexReducer } from 'movex-core-util';

export const SPEED_GAME_TIME_TO_PUSH_MS = 50;

type Players = 'red' | 'blu';

export type SpeedGameState =
  | {
      status: 'pending';
      winner: undefined;
      lastPushBy: undefined;
      lastPushAt: undefined;
    }
  | {
      status: 'ongoing';
      winner: undefined;
      lastPushBy: Players;
      lastPushAt: number;
    }
  | {
      status: 'completed';
      winner: Players;
      lastPushBy: Players;
      lastPushAt: number;
    };

type SpeedPushGameActions =
  | Action<'push', { at: number; by: Players }>
  | Action<'unrelatedAction'>;

export const initialSpeedPushGameState: SpeedGameState = {
  status: 'pending',
  winner: undefined,
  lastPushBy: undefined,
  lastPushAt: undefined,
};

export const speedPushGameReducer: MovexReducer<
  SpeedGameState,
  SpeedPushGameActions
> = (
  state: SpeedGameState = initialSpeedPushGameState,
  action: SpeedPushGameActions
): SpeedGameState => {
  if (action.type === 'push') {
    if (state.status === 'completed') {
      return state;
    }

    // Same player cannot move consecutively
    if (state.lastPushBy === action.payload.by) {
      return state;
    }

    if (
      state.status === 'ongoing' &&
      action.payload.at > state.lastPushAt + SPEED_GAME_TIME_TO_PUSH_MS
    ) {
      return {
        status: 'completed',
        winner: state.lastPushBy,
        lastPushAt: state.lastPushAt,
        lastPushBy: state.lastPushBy,
      };
    }

    return {
      status: 'ongoing',
      winner: undefined,
      lastPushAt: action.payload.at,
      lastPushBy: action.payload.by,
    };
  }

  return state;
};

// How does it move to complete? With the $transfomer

speedPushGameReducer.$transformState = (state, context) => {
  const NOW = context.now();

  if (
    state.status === 'ongoing' &&
    NOW > state.lastPushAt + SPEED_GAME_TIME_TO_PUSH_MS
  ) {
    return {
      status: 'completed',
      winner: state.lastPushBy,
      lastPushAt: state.lastPushAt,
      lastPushBy: state.lastPushBy,
    };
  }

  return state;
};

// Idea to solve server only state:
//  The MovexMasterContext can be an optional varibale that the reducer, the @stateTransformerand even the $reconciliator
//  receives that can include a series of vairables (e.g NOW(), but also LAG()) that calculates the current lag and these can be eagerly loaded
//  but then corrected by the server