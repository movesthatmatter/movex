import { Action } from 'movex-core-util';
import { Color, ParticipantId } from './state';

export type ChatActions =
  | Action<
      'addParticipant',
      {
        id: ParticipantId;
        color: Color;
        atTimestamp: number;
      }
    >
  | Action<
      'removeParticipant',
      {
        id: ParticipantId;
        atTimestamp: number;
      }
    >
  | Action<
      'writeMessage',
      {
        participantId: ParticipantId;
        msg: string;
        atTimestamp: number;
        // id: string;
      }
    >
  | Action<
      'setTyping',
      {
        participantId: ParticipantId;
        isTyping: boolean;
      }
    >;
