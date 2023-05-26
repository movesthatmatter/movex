import movexConfig from 'apps/movex-demo/movex.config';
import { useMovexResource } from 'apps/movex-demo/movex-react';
import { initialChatState } from '../../modules/chat/chat.movex';

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
            // const id = toResourceIdentifierObj(item.rid).resourceId;
            // console.log('created chat id', item.id);
            window.location.href = window.location.href + `/${item.id}`;
          });
        }}
      >
        Create Chat
      </button>
    </div>
  );
};

export default ChatLobby;
