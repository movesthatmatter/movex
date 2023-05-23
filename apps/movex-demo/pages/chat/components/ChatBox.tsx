import { useEffect, useMemo, useRef } from 'react';
// import { Client as MovexClient } from 'movex';
import chatReducer, { initialChatState } from '../chat.movex';
import io, { Socket } from 'socket.io-client';
import { Movex } from 'movex';

type Props = {
  movex: Movex;
};

export const ChatBox: React.FC<Props> = ({ movex }) => {
  // useEffect(() => {
  //   console.log('got movex', movex.getClientId());
  // }, [movex]);

  const chatResource = useMemo(
    () => movex.register('chat', chatReducer),
    [movex]
  );

  // useEffect(() => {

  // })

  // const [chatRid, setChatRid] = useState<Movex.ResourceIdentifier>();

  useEffect(() => {
    console.log('got chatResource', chatResource);

    chatResource.create(initialChatState).map((rid) => {
      console.log('chat created:', rid)
    })
  }, [chatResource])

  return <div>chat box</div>;
};
