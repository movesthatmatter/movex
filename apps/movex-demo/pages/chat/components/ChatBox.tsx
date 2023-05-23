import { useEffect, useRef } from 'react';
// import { Client as MovexClient } from 'movex';
import chatReducer from '../chat.movex';
import io, { Socket } from 'socket.io-client';
import { Movex } from 'movex';

type Props = {
  movex: Movex;
};

export const ChatBox: React.FC<Props> = () => {
  return <div>chat box</div>;
};
