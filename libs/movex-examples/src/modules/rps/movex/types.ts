import { MovexClient } from  'movex-core-util';

export type PlayerId = MovexClient['id'];
export type Color = string;

export type RPS = 'rock' | 'paper' | 'scissors';

export const playerLabels = ['playerA', 'playerB'] as const;
export type PlayerLabel = 'playerA' | 'playerB';

type Player = {
  id: PlayerId;
  label: PlayerLabel;
};

type RevealedSubmission = {
  play: RPS;
};

type SecretSubmission = {
  play: '$SECRET';
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
  winner: RPS | '1/2';
};

export type Game = GameInProgress | GameCompleted;
