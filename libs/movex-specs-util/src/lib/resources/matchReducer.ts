// id: string;
//   playersTotal: number;
//   // waitTime:
//   players: Record<PlayerIdentifier, true>;
//   matcher: string; // this is the matcher pattern: "chess" or "chess:5min" or "chess:5min:white", the more items the more limiting/accurate to match
//   game: TGame;

import { MovexClient, UnknownRecord, Action } from 'movex-core-util';

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

    // game: GameState; // Here what could happen instead of using the ID, which is harder/impossible to give atm, is to adda nother redcer with a special Movex.addReducer(gameReducer)
    //  which will somehow get connected in the backend. Hmm, but the other thing that could happen is that the game state simply becomes part of the match reducer.
    // This is not the best only b/c the Match could be part of Matterio, but otherwise it coudl work. So Match is the comprising type of the match data plus the game.
    // And the game literally is just the game state. So in this way no knowledge of a Game Id needs to be generated but only the game state itself in some places. Game pretty
    // much becomes part of the Match (for now at least). And the Match in this case is the combinatin of the ChallengeState with a Game
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
    if (Object.keys(state.players).length < state.maxPlayers) {
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
