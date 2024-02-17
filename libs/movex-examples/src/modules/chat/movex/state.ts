import { MovexClient } from  'movex-core-util';

export type ParticipantId = MovexClient['id'];
export type Color = string;

export type ChatMsg = {
  // id: string;
  at: number;
  content: string;
  participantId: ParticipantId;
};

export type ChatState = {
  participants: {
    [id in ParticipantId]: {
      id: ParticipantId;
      color: Color;
      joinedAt: number;
    } & (
      | {
          active: false;
          isTyping?: null;
          leftAt: number;
        }
      | {
          active: true;
          isTyping: boolean;
          leftAt?: null; // Limitation with undefined. Some jsons remove it altogether which could create mismatches. Use null
        }
    );
  };
  messages: ChatMsg[];
};

export const initialChatState: ChatState = {
  participants: {},
  messages: [],
};
