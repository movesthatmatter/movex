import counterReducer from './util/counterReducer';
import gameReducer, { initialGameState } from './util/gameReducer';
import { createMovexInstance } from '../lib';
import { computeCheckedState } from '../lib/util';

test('Initial State', () => {
  const instance = createMovexInstance({
    url: 'n/a',
    apiKey: 'n/a',
  });

  const resource = instance.registerResource('counter', counterReducer);

  const expected = computeCheckedState({
    count: 0,
  });

  expect(resource.get()).toEqual(expected);
});

test('Dispatch Punblic Action', () => {
  const instance = createMovexInstance({
    url: 'n/a',
    apiKey: 'n/a',
  });

  const resource = instance.registerResource('counter', counterReducer);

  resource.dispatch({ type: 'increment' });

  const expected = computeCheckedState({
    count: 1,
  });

  expect(resource.get()).toEqual(expected);
});

test('Dispatch Private Action', () => {
  const instance = createMovexInstance({
    url: 'n/a',
    apiKey: 'n/a',
  });

  const resource = instance.registerResource('counter', gameReducer);

  resource.dispatchPrivate(
    {
      type: 'submitMoves',
      payload: {
        color: 'white',
        moves: ['w:e2-e4', 'w:d2-d4'],
      },
      isPrivate: true,
    },

    { type: 'readySubmissionState', payload: { color: 'white' } }
  );

  const expected = computeCheckedState({
    ...initialGameState,
    submission: {
      ...initialGameState.submission,
      status: 'partial',
      white: {
        canDraw: false,
        moves: ['w:e2-e4', 'w:d2-d4'],
      },
    },
  });

  expect(resource.get()).toEqual(expected);
});

// TODO: Add more tests
