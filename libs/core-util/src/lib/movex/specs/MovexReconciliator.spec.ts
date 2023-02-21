import deepClone from 'deep-clone';
import { Submission } from './types';
import { getJSONPatchDiff, reconciliatePrivateFragments } from '../movexReconciliator';

// describe('state as primitive', () => {
//   type State = number;

//   test('basic', () => {
//     const state = 0;

//     const diff =
//   })
// })

type State = {
  count: number;
  submission: Submission;
};

test('get diffs', () => {
  const initialState: State = {
    count: 0,
    submission: {
      status: 'partial',
      white: {
        canDraw: true,
        moves: [],
      },
      black: {
        canDraw: false,
        moves: ['b:E7-E6', 'b:f7-f6'],
      },
    },
  };

  // const state = {
  //   string: 'a string',
  //   number: 1,
  //   bool: false,
  //   nullable: null,
  // };

  const next = {
    ...initialState,
    // count: 1,
    submission: {
      ...initialState.submission,
      // white: {
      //   canDraw: false,
      //   moves: ['m1', 'm2'],
      // },
      white: undefined,
      black: {
        canDraw: true,
        moves: [],
      },
    },
  };

  const diff = getJSONPatchDiff(initialState, next);
  // console.log('micro diff', getJSONDiff(initialState, next));
  // console.log('json patch diff', diff);
  // console.log();

  const actual = reconciliatePrivateFragments(deepClone(initialState), [diff]);

  expect(actual).toEqual(next);
});

// json patch diff [
//   { op: 'remove', path: '/submission/black/moves/1' },
//   { op: 'remove', path: '/submission/black/moves/0' },
//   { op: 'replace', path: '/submission/black/canDraw', value: true },
//   { op: 'remove', path: '/submission/white' }
// ]

// micro diff [
//   {
//     path: [ 'submission', 'white' ],
//     type: 'CHANGE',
//     value: undefined,
//     oldValue: { canDraw: true, moves: [] }
//   },
//   {
//     path: [ 'submission', 'black', 'canDraw' ],
//     type: 'CHANGE',
//     value: true,
//     oldValue: false
//   },
//   {
//     type: 'REMOVE',
//     path: [ 'submission', 'black', 'moves', 0 ],
//     oldValue: 'b:E7-E6'
//   },
//   {
//     type: 'REMOVE',
//     path: [ 'submission', 'black', 'moves', 1 ],
//     oldValue: 'b:f7-f6'
//   }
// ]

describe('reconcile from diffs', () => {
  const initialState: State = {
    count: 0,
    submission: {
      status: 'partial',
      white: {
        canDraw: true,
        moves: [],
      },
      black: {
        canDraw: false,
        moves: ['b:E7-E6', 'b:f7-f6'],
      },
    },
  };

  // const actual = reconciliatePrivateFragments()

  // const actual = reconciliatePrivateFragments(deepClone(initialState), [{
  //   op: 'replace',

  // }]);
});
