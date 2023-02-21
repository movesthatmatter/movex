// // import { getStateDiff, mutablePatchStateWithDiff } from '../util';
// import deepClone from 'deep-clone';

// xdescribe('State Diff', () => {
//   test('gets correct diff AND then applies the patch', () => {
//     const prev = {
//       count: 0,
//       submission: {
//         status: 'none',
//         white: {
//           canDraw: true,
//           moves: [],
//         },
//         black: {
//           canDraw: true,
//           moves: [],
//         },
//       },
//     };

//     const next = {
//       count: 3,
//       submission: {
//         status: 'partial',
//         white: {
//           canDraw: false,
//           moves: ['e2e4'],
//         },
//         black: {
//           canDraw: true,
//           moves: [],
//         },
//       },
//     };

//     const expected = deepClone({
//       count: 3,
//       submission: {
//         status: 'partial',
//         white: {
//           canDraw: false,
//           moves: ['e2e4'],
//         },
//         black: {
//           canDraw: true,
//           moves: [],
//         },
//       },
//     });

//     const diff = getStateDiff(prev, next);

//     expect(mutablePatchStateWithDiff(prev, diff)).toEqual(expected);
//   });
// });
