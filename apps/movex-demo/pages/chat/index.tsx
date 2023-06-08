import { useMovexResource } from 'movex-react';
import { DemoMovexDefinition } from 'apps/movex-demo/movex';
import { Chat } from 'movex-examples';

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
