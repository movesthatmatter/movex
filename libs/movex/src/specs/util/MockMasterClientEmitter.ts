import { Emitter, ResourceIdentifier } from 'movex-core-util';
import { Pubsy } from 'ts-pubsy';
import { MasterClientIOEvents } from '../../lib/io/MasterClientIOEvents';
import { MovexMasterResource } from '../../lib/master';
import { LocalMovexStore, MovexStoreItem } from '../../lib/master-store';
import { AnyAction } from '../../lib/tools/action';
import { GetReducerState } from '../../lib/tools/reducer';
import counterReducer from './counterReducer';

export class MockMasterClientEmitter<
  TState extends any = any,
  TAction extends AnyAction = AnyAction,
  TResourceType extends string = string
> implements Emitter<MasterClientIOEvents<TState, TAction, TResourceType>>
{
  private mainPubsy = new Pubsy<{
    [E in keyof MasterClientIOEvents<
      TState,
      TAction,
      TResourceType
    >]: Parameters<MasterClientIOEvents<TState, TAction, TResourceType>[E]>[0];
  }>();

  private ackPubsy = new Pubsy<{
    [E in keyof MasterClientIOEvents]: ReturnType<
      MasterClientIOEvents<TState, TAction, TResourceType>[E]
    >;
  }>();

  constructor(private masterResource: MovexMasterResource<TState, TAction>) {}

  on<E extends keyof MasterClientIOEvents<TState, TAction, TResourceType>>(
    event: E,
    // listener: MasterClientIOEvents<TState, TAction, TResourceType>[E]
    listener: (
      p: Parameters<MasterClientIOEvents<TState, TAction, TResourceType>[E]>[0],
      ack: (
        res: ReturnType<MasterClientIOEvents<TState, TAction, TResourceType>[E]>
      ) => void
    ) => void
  ) {
    // if (event === 'createResource') {

    // }
    this.mainPubsy.subscribe('createResource', (req) => {
      listener(req, (res) => {
        this.masterResource.create(req.resourceType, req.resourceState);

        // this.ackPubsy.publish('')
        // this.emit('createResource')
      });
    });

    return this;
  }

  off<E extends keyof MasterClientIOEvents<TState, TAction, TResourceType>>(
    event: E,
    listener: (
      p: Parameters<MasterClientIOEvents<TState, TAction, TResourceType>[E]>[0],
      ack: (
        r: ReturnType<MasterClientIOEvents<TState, TAction, TResourceType>[E]>
      ) => void
    ) => void
  ) {
    return this;
  }

  emit<E extends keyof MasterClientIOEvents<TState, TAction, TResourceType>>(
    event: E,
    request: Parameters<
      MasterClientIOEvents<TState, TAction, TResourceType>[E]
    >[0],
    acknowledgeCb?: (
      response: ReturnType<
        MasterClientIOEvents<TState, TAction, TResourceType>[E]
      >
    ) => void
  ) {
    // if (acknowledgeCb) {
    //   this.ackPubsy.subscribe(event, acknowledgeCb);
    // }

    if (event === 'createResource') {
      // console.log('createResource request', request.resourceType);
      const req = request as Parameters<
        MasterClientIOEvents<TState, TAction, TResourceType>['createResource']
      >[0];

      this.masterResource
        .create(req.resourceType, req.resourceState)
        .resolve()
        .then((r) => {
          const res = {
            ok: r.ok,
            err: r.err,
            val: r.val,
          } as ReturnType<
            MasterClientIOEvents<TState, TAction, TResourceType>[E]
          >;

          acknowledgeCb?.(res);
        });
    }

    else if (event === 'getResourceState') {
    }

    return true;
  }

  emitAndAcknowledge<
    E extends keyof MasterClientIOEvents<TState, TAction, TResourceType>
  >(
    event: E,
    request: Parameters<
      MasterClientIOEvents<TState, TAction, TResourceType>[E]
    >[0]
  ) {
    return new Promise<
      ReturnType<MasterClientIOEvents<TState, TAction, TResourceType>[E]>
    >((resolve) => {
      this.emit(event, request, resolve);
    });
  }
}

// const localStore = new LocalMovexStore<
//   GetReducerState<typeof counterReducer>
// >();
// const masterResource = new MovexMasterResource(counterReducer, localStore);
// const mock = new MockMasterClientEmitter(masterResource);

// // Client
// mock.emit(
//   'getResourceState',
//   {
//     rid: '' as ResourceIdentifier<string>,
//   },
//   (res) => {
//     if (res.ok) {
//       // res.val[0].count
//     }
//     // res[0];
//   }
// );

// // server

// mock.on('getResourceState', async (msg, ack) => {
//   // get resource async
//   // new AsyncOk({} as MovexStoreItem<Get>).map((s) => {
//   //   ack(new Ok(s.state));
//   //   // ack(new Ok(s.state));
//   // });
// });

// // TODO Next: Came up with the concept of EventEmitter (local, mock, socket) which is the only piece that needs to be mocked for testing
