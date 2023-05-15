// id: string;
//   playersTotal: number;
//   // waitTime:
//   players: Record<PlayerIdentifier, true>;
//   matcher: string; // this is the matcher pattern: "chess" or "chess:5min" or "chess:5min:white", the more items the more limiting/accurate to match
//   game: TGame;

import { MovexClient, UnknownRecord } from 'movex-core-util';
import { Action } from '../../lib/tools/action';
import { initialGameState } from './gameReducer';

export type PlayerId = MovexClient['id'];

export type BaseMatchState<TGame extends UnknownRecord = UnknownRecord> = {
  maxPlayers: number;
  players: Record<PlayerId, true>;
  // gameId: string; // TODO: If we need to this could actually be the fulll game state in different stages PendingGame for WaitingMatch, InProgressGame for inProgress and Completed otherwsie
};

export type WaitingMatchState<TGame extends UnknownRecord = UnknownRecord> =
  BaseMatchState<TGame> & {
    status: 'waiting'; // waiting for players
    winner: undefined;
    gameId: undefined; // In the real word this might change into the game state to make it easier. but let's see how that evolves aas I'm not sure it will be easier
  };

export type InProgressMatchState<TGame extends UnknownRecord = UnknownRecord> =
  BaseMatchState<TGame> & {
    status: 'inProgress'; // waiting for players
    winner: undefined;
    gameId: string;
  };

export type CompletedMatchState<TGame extends UnknownRecord = UnknownRecord> =
  BaseMatchState<TGame> & {
    status: 'completed'; // waiting for players
    winner: PlayerId | '1/2';
    gameId: string;
  };

export type MatchState<TGame extends UnknownRecord = UnknownRecord> =
  | WaitingMatchState<TGame>
  | InProgressMatchState<TGame>
  | CompletedMatchState<TGame>;

export const initialMatchState: MatchState = {
  status: 'waiting',
  gameId: undefined, // TODO: Not sure I need to store the whole game in here or just a pointer. The pointer makes the most sense
  maxPlayers: 2,
  players: {},
  winner: undefined,
};

export type MatchActions =
  | Action<
      'addPlayer',
      {
        playerId: PlayerId;
      }
    >
  | Action<'start', { gameId: string }>
  | Action<
      'end',
      {
        winner: NonNullable<MatchState['winner']>;
      }
    >;

const matchReducer = (
  state = initialMatchState as MatchState,
  action: MatchActions
): MatchState => {
  if (action.type === 'addPlayer') {
    if (Object.keys(state.players).length + 1 === state.maxPlayers) {
      return {
        ...state,
        players: {
          ...state.players,
          [action.payload.playerId]: true,
        },
      };
    }
  } else if (action.type === 'start') {
    if (Object.keys(state.players).length !== state.maxPlayers) {
      // If the players count aren't the same as max player count the game cannot start
      return state;
    }

    if (state.status !== 'waiting') {
      return state;
    }

    return {
      ...state,
      status: 'inProgress',
      gameId: action.payload.gameId,
    };
  } else if (action.type === 'end') {
    if (state.status !== 'inProgress') {
      return state;
    }

    return {
      ...state,
      status: 'completed',
      winner: action.payload.winner,
    };
  }

  return state;
};

export default matchReducer;
