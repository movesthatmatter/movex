import { useEffect, useState } from 'react';
import { ChatBox } from './components/ChatBox';
import { Movex, initMovex } from 'libs/movex/src/lib/client';

type Props = {};

const useMovexWithNext = () => {
  const [movex, setMovex] = useState<Movex>();

  useEffect(() => {
    fetch('/api/socket').then(() => {
      initMovex(setMovex);
    });
  }, []);

  return movex;
};

const ChatSystem: React.FC<Props> = () => {
  const movex = useMovexWithNext();

  return <>{movex ? <ChatBox movex={movex} /> : <>Initializing</>}</>;
};

export default ChatSystem;
