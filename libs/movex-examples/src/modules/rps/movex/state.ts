import { Game, PlayerLabel, playerLabels } from './types';

export type State = Game;

export const initialState: State = {
  players: {
    playerA: null,
    playerB: null,
  },
  winner: null,
  submissions: {
    playerA: null,
    playerB: null,
  },
};

export const selectAvailableLabels = (state: State): PlayerLabel[] => {
  return playerLabels.filter((l) => state.players[l] === null);
};
