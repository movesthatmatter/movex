import { useMovexResource } from 'movex-react';
import { initialChatState } from '../../modules/chat/chat.movex';
import movexConfig from 'apps/movex-demo/movex.config';

type Props = {};

const ChatLobby: React.FC<Props> = () => {
  const chatResource = useMovexResource(movexConfig, 'chat');

  if (!chatResource) {
    return null;
  }

  return (
    <div>
      <button
        onClick={() => {
          chatResource.create(initialChatState).map((item) => {
            window.location.href = window.location.href + `/${item.rid.resourceId}`;
          });
        }}
      >
        Create Chat
      </button>
    </div>
  );
};

export default ChatLobby;
