import React from 'react';
import { RPS } from './components/RPS';
// import { MovexLocalProvider } from 'movex-react';
import movexConfig from '../examples';
// import movexConfig from './movex.config';

type w = string;

// console.log('ss', movexConfig);

export const Showcase: React.FC = () => {
  console.log('movexConfig', movexConfig);

  return (
    // <MovexLocalProvider movexDefinition={movexConfig}>
      <RPS />
    // {/* </MovexLocalProvider> */}
  );
};
