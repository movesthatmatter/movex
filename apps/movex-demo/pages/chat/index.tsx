import { useMovexResource } from 'movex-react';
import { initialChatState } from '../../modules/chat/chat.movex';
import { DemoMovexDefinition } from 'apps/movex-demo/movex';

type Props = {};

const ChatLobby: React.FC<Props> = () => {
  const chatResource = useMovexResource<DemoMovexDefinition>('chat');

  if (!chatResource) {
    return null;
  }

  return (
    <div>
      <button
        onClick={() => {
          chatResource.create(initialChatState).map((item) => {
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
