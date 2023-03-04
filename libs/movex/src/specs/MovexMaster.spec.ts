import { MovexMaster } from '../lib/MovexMaster';
import counterReducer from './util/counterReducer';
import { LocalMovexStore } from '../lib/store';
import { AnyResourceIdentifier, ResourceIdentifier } from 'movex-core-util';

test('it works', () => {
  // This is the api more or less
  /// socket.on('action', (action) => {

  // })
  const master = new MovexMaster(counterReducer, new LocalMovexStore());

  // master.getPublic('asd' as AnyResourceIdentifier).map((s) => s[0].count);

  // master.get('asd' as AnyResourceIdentifier, 'client1').map((s) => s[0].count);

  // master
  //   .applyAction('asd' as AnyResourceIdentifier, 'client', [
  //     {
  //       type: 'increment',
  //       isPrivate: true,
  //     },
  //     {
  //       type: 'decrement',
  //     },
  //   ])
  //   .map((s) => {
  //     s.
  //     s[1].id;
  //   });

  // master
  //   .applyAction('asd' as AnyResourceIdentifier, 'asd', {
  //     type: 'change',
  //     payload: 23,
  //   })
  //   .map((s) => {
  //     s.patches;
  //   });
});
