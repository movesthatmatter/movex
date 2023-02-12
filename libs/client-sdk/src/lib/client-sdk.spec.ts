import { ClientResourceShape } from '@matterio/core-util';
import { ClientSdk } from './client-sdk';

type ActionsMap = {
  increment: undefined;
  incrementBy: number;
};

type GameState = { status: 'test'; counter: number };

type GameResource = ClientResourceShape<'game', GameState>;

let clientSdk: ClientSdk<
  {},
  GameState,
  ActionsMap,
  {
    matches: {
      id: string;
      game: GameState;
    };
  }
>;

describe('matches', () => {
  it('should work', () => {
    clientSdk = new ClientSdk({ url: '', apiKey: '' });
    // expect(backend()).toEqual('backend');

    clientSdk.createMatch({
      matcher: '',
      playersTotal: 2,
      game: {
        status: 'test',
        counter: 0,
      },
    });
  });
});

// describe('Resource Reducer', () => {
//   it('works', async () => {
//     const matchResource = await clientSdk
//       .createResource({
//         resourceType: 'matches',
//         resourceData: {
//           // matcher: '',
//           // playersTotal: 2,
//           game: {
//             status: 'test',
//             counter: 0,
//           },
//         },
//       })
//       .resolveUnwrap();

//     const actionHandler = createResourceActionHandler<
//       GameResource,
//       ActionsMap
//     >({
//       // increment: (prev, action) => {
//       //   return prev;

//       // },
//       increment(p) {
//         return p;
//       }
//       // $canReconcile: (state) => state.,
//     });

//     // This can only be called after the resource exists
//     // so it might make sense to be paired with an observer resource
//     const dispatch = clientSdk.registerResourceReducer(
//       getResourceRId(matchResource),
//       {
//         increment: (prev) => {
//           return {
//             ...prev,
//             game: {
//               ...prev.game,
//               counter: prev.game.counter + 1,
//             },
//           };
//         },
//       },
//       (m) => {
//         m.game.counter;
//       }
//     );

//     dispatch('increment', undefined);
//   });
// });
