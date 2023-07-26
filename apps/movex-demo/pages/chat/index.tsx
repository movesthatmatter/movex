import { useMovexResourceType } from 'movex-react';
import { Chat } from 'movex-examples';
import movexConfig from 'movex-examples';

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
              window.location.href + `/${item.rid.resourceId}`;
          });
        }}
      >
        Create Chat
      </button>
    </div>
  );
};

export default ChatLobby;
