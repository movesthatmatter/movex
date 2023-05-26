import { Action } from 'movex';
import { MovexClient } from 'movex-core-util';

type ParticipantId = MovexClient['id'];
type Color = 'yellow' | 'orange' | 'green' | 'blue';

type ChatMsg = {
  // id: string;
  // at: number;
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
          leftAt: number;
        }
      | {
          active: true;
          leftAt?: undefined;
        }
    );
  };
  messages: ChatMsg[];
};

export const initialChatState: ChatState = {
  participants: {},
  messages: [],
};

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
        // atTimestamp: number;
        // id: string;
      }
    >;

export const chatReducer = (
  state = initialChatState as ChatState,
  action: ChatActions
): ChatState => {
  if (action.type === 'addParticipant') {
    return {
      ...state,
      participants: {
        ...state.participants,
        [action.payload.id]: {
          id: action.payload.id,
          joinedAt: action.payload.atTimestamp,
          color: action.payload.color,
          active: true,
          leftAt: undefined,
        },
      },
    };
  } else if (action.type === 'removeParticipant') {
    if (!state.participants[action.payload.id]) {
      return state;
    }

    return {
      ...state,
      participants: {
        ...state.participants,
        [action.payload.id]: {
          ...state.participants[action.payload.id],
          active: false,
          leftAt: action.payload.atTimestamp,
        },
      },
    };
  } else if (action.type === 'writeMessage') {
    return {
      ...state,
      messages: [
        ...state.messages,
        {
          // id: action.payload.id, // This could be improved if needed. Can come from outside etc...
          // at: action.payload.atTimestamp,
          content: action.payload.msg,
          participantId: action.payload.participantId,
        },
      ],
    };
  }

  return state;
};

// export default chatReducer;
