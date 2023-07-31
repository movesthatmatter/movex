import { useMovexResourceType } from 'movex-react';
import { Chat } from 'movex-examples';
import movexConfig from 'movex-examples';
import { toRidAsStr } from 'movex';

type Props = {};

const ChatLobby: React.FC<Props> = () => {
  const chatResource = useMovexResourceType(movexConfig, 'chat');

  if (!chatResource) {
    return null;
  }

  return (
    <div>
      <button
        onClick={() => {
          chatResource.create(Chat.initialChatState).map((item) => {
            window.location.href =
              window.location.href + `/${toRidAsStr(item.rid)}`;
          });
        }}
      >
        Create Chat
      </button>
    </div>
  );
};

export default ChatLobby;
