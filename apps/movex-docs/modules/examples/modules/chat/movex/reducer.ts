import { ChatActions } from './actions';
import { ChatState, initialChatState } from './state';

export const reducer = (
  state = initialChatState,
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
          leftAt: null,
          isTyping: false,
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
          isTyping: undefined,
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
          at: action.payload.atTimestamp,
          content: action.payload.msg,
          participantId: action.payload.participantId,
        },
      ],
    };
  } else if (action.type === 'setTyping') {
    const prevParticipant = state.participants[action.payload.participantId];

    if (!prevParticipant) {
      return state;
    }

    if (!prevParticipant.active) {
      return state;
    }

    return {
      ...state,
      participants: {
        ...state.participants,
        [action.payload.participantId]: {
          ...prevParticipant,
          isTyping: action.payload.isTyping,
        },
      },
    };
  }

  return state;
};
