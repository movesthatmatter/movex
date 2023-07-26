import { useMovexBoundResourceFromRid, useMovexClientId } from 'movex-react';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { toResourceIdentifierObj } from 'movex-core-util';
import movexConfig, { Chat } from 'movex-examples';

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
  const boundResource = useMovexBoundResourceFromRid(movexConfig, rid);
  const userId = useMovexClientId(movexConfig);

  if (!(boundResource && userId)) {
    return null;
  }

  return <Chat.Main boundChatResource={boundResource} userId={userId} />;
};

export default ChatSystem;
