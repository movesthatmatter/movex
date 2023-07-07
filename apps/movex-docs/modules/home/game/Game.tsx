import React, { useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import {
  MovexLocalMasterProvider,
  MovexLocalProvider,
  MovexProvider,
} from 'movex-react';
import movexConfig from './movex.config';

export const Game = () => {
  return (
    <MovexLocalProvider
      movexDefinition={movexConfig}
      // socketUrl="movex-try-1.fly.dev"
      onConnected={(r) => {
        console.log('connected', r);
      }}
      // onInit={(x) => {
      //   console.log('[MovexLocalMaster] initiated', x);
      // }}
    >
      works
    </MovexLocalProvider>
  );
};
