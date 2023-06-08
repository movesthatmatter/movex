import { Action } from 'movex';
import { PlayerId, PlayerLabel, RPS } from './types';

export type Actions =
  | Action<
      'addPlayer',
      {
        id: PlayerId;
        playerLabel: PlayerLabel;
        atTimestamp: number;
      }
    >
  | Action<'playAgain'>
  | Action<
      'submit',
      {
        playerLabel: PlayerLabel;
        rps: RPS;
      }
    >
  | Action<
      'setReadySubmission',
      {
        playerLabel: PlayerLabel;
      }
    >;
