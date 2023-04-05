// import { Ok } from 'ts-results';
// import { MovexClientResource } from '../lib/MovexClientResource';
// import { computeCheckedState } from '../lib/util';
// import counterReducer, { initialCounterState } from './util/counterReducer';

// describe('Observable', () => {
//   test('Dispatch Local Actions', () => {
//     const xResource = new MovexClientResource(counterReducer);

//     xResource.dispatch({
//       type: 'increment',
//     });

//     expect(xResource.getUncheckedState()).toEqual({ count: 1 });

//     xResource.onUpdated((nextCheckedState) => {
//       expect(nextCheckedState).toEqual(
//         computeCheckedState({
//           count: 4,
//         })
//       );
//     });

//     xResource.dispatch({
//       type: 'incrementBy',
//       payload: 3,
//     });

//     expect(xResource.getUncheckedState()).toEqual({ count: 4 });
//   });

//   test('Apply Local Actions', () => {
//     const xResource = new MovexClientResource(counterReducer);

//     xResource.applyAction({
//       type: 'increment',
//     });

//     expect(xResource.getUncheckedState()).toEqual({ count: 1 });

//     xResource.onUpdated((nextCheckedState) => {
//       expect(nextCheckedState).toEqual(
//         computeCheckedState({
//           count: 4,
//         })
//       );
//     });

//     xResource.dispatch({
//       type: 'incrementBy',
//       payload: 3,
//     });

//     expect(xResource.getUncheckedState()).toEqual({ count: 4 });
//   });

//   describe('External Updates', () => {
//     test('updates the unchecked state', () => {
//       const xResource = new MovexClientResource(counterReducer);

//       xResource.dispatch({
//         type: 'increment',
//       });

//       expect(xResource.getUncheckedState()).toEqual({ count: 1 });

//       xResource.updateUncheckedState({
//         count: 40,
//       });

//       expect(xResource.getUncheckedState()).toEqual({ count: 40 });

//       xResource.dispatch({
//         type: 'decrement',
//       });

//       expect(xResource.getUncheckedState()).toEqual({ count: 39 });
//     });

//     describe('Reconciliate Action', () => {
//       test('Updates when matching', () => {
//         const xResource = new MovexClientResource(counterReducer);

//         const updateSpy = jest.fn();
//         xResource.onUpdated(updateSpy);

//         const [incrementedState, incrementedStateChecksum] =
//           computeCheckedState({
//             ...initialCounterState,
//             count: initialCounterState.count + 1,
//           });

//         const actual = xResource.reconciliateAction({
//           action: {
//             type: 'increment',
//           },
//           checksum: incrementedStateChecksum,
//         });

//         expect(actual).toEqual(
//           new Ok([incrementedState, incrementedStateChecksum])
//         );

//         expect(updateSpy).toHaveBeenCalledWith([
//           incrementedState,
//           incrementedStateChecksum,
//         ]);
//       });

//       test('Fails when NOT matching and does not update', () => {
//         const xResource = new MovexClientResource(counterReducer);

//         const updateSpy = jest.fn();
//         xResource.onUpdated(updateSpy);

//         const actual = xResource.reconciliateAction({
//           action: {
//             type: 'increment',
//           },
//           checksum: 'wrong_checksum',
//         });

//         expect(actual.val).toEqual('ChecksumMismatch');
//       });
//     });
//   });

//   // TODO: test xresource destroy which unsubscribes
// });
