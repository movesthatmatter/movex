import { PlayerLabel, RPS } from './types';

export function toOppositeLabel<L extends PlayerLabel>(
  c: L
): L extends 'playerA' ? 'playerB' : 'playerA';

export function toOppositeLabel<L extends PlayerLabel>(l: L) {
  return l === 'playerA' ? 'playerB' : 'playerA';
}

export const getRPSWinner = ([a, b]: [
  RPS | '$SECRET' | null | undefined,
  RPS | '$SECRET' | null | undefined
]): RPS | '1/2' | null => {
  if (!a || a === '$SECRET' || !b || b === '$SECRET') {
    return null;
  }

  if (a === b) {
    return '1/2';
  }

  if (a === 'paper') {
    if (b === 'rock') {
      return a;
    }

    return b;
  } else if (a === 'rock') {
    if (b === 'scissors') {
      return a;
    }

    return b;
  }

  // (a === 'scissors') {
  else if (b === 'paper') {
    return a;
  }

  return b;
};
