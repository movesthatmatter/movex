#!/usr/bin/env node

import { movexServer } from './lib/movex-server';

type Check = number;

const x: Check = 2;

movexServer(
  {},
  {
    resources: {},
  }
);

console.log('bin wooooorks', x);
