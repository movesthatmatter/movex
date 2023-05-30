import { useMovexBoundResource, useMovexClientId } from 'movex-react';
import { useRouter } from 'next/router';
import { ChatPage } from '../../modules/chat/components/ChatPage';
import { useMemo } from 'react';
import { toResourceIdentifierObj } from 'movex-core-util';
import movexConfig from 'apps/movex-demo/movex.config';

type Props = {};

const ChatSystem: React.FC<Props> = () => {
  const { chatId } = useRouter().query;

  const rid = useMemo(
    () =>
      toResourceIdentifierObj({
        resourceId: (chatId as string) || '',
        resourceType: 'chat',
      }),
    [chatId]
  );

  // TODO: Validate the rid is correct inside useMovexBoundResouce
  const boundResource = useMovexBoundResource(movexConfig, rid);
  const userId = useMovexClientId();

  if (!(boundResource && userId)) {
    return null;
  }

  return <ChatPage boundChatResource={boundResource} userId={userId} />;
};

export default ChatSystem;
