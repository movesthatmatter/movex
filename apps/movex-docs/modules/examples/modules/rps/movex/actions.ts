import { Action } from 'movex-core-util';
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
