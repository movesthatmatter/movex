import { Emitter, GetIOPayloadOKTypeFrom } from 'movex-core-util';
import { Pubsy } from 'ts-pubsy';
import { IOEvents } from '../../lib/io-connection/io-events';
import { MovexMasterResource } from '../../lib/master';
import { AnyAction } from '../../lib/tools/action';

export class MockConnectionEmitter<
  TState extends any = any,
  TAction extends AnyAction = AnyAction,
  TResourceType extends string = string
> implements Emitter<IOEvents<TState, TAction, TResourceType>>
{
  private mainPubsy = new Pubsy<{
    [E in keyof IOEvents<TState, TAction, TResourceType>]: Parameters<
      IOEvents<TState, TAction, TResourceType>[E]
    >[0];
  }>();

  private ackPubsy = new Pubsy<{
    [E in keyof IOEvents]: ReturnType<
      IOEvents<TState, TAction, TResourceType>[E]
    >;
  }>();

  constructor(
    private masterResource: MovexMasterResource<TState, TAction>,
    private clientId: string
  ) {}

  on<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    // listener: IOEvents<TState, TAction, TResourceType>[E]
    listener: (
      p: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
      ack: (
        res: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
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

  off<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    listener: (
      p: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
      ack: (r: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>) => void
    ) => void
  ) {
    return this;
  }

  emit<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    request: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
    acknowledgeCb?: (
      response: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
    ) => void
  ) {
    // if (acknowledgeCb) {
    //   this.ackPubsy.subscribe(event, acknowledgeCb);
    // }

    if (event === 'createResource') {
      const req = request as Parameters<
        IOEvents<TState, TAction, TResourceType>['createResource']
      >[0];

      type ResponseType = ReturnType<
        IOEvents<TState, TAction, TResourceType>['createResource']
      >;

      this.masterResource
        .create(req.resourceType, req.resourceState)
        .map((masterResource) => {
          // const ridObj = toResourceIdentifierObj(masterResource.id);

          // I feel like this should be in another master place, but the state comes from there already actually, no?
          const masterToClientResource: GetIOPayloadOKTypeFrom<ResponseType> = {
            rid: masterResource.rid,
            state: masterResource.state,
          };

          return masterToClientResource;
        })
        .resolve()
        .then((r) => {
          const res = {
            ok: r.ok,
            err: r.err,
            val: r.val,
          } as ReturnType<IOEvents<TState, TAction, TResourceType>[E]>;

          acknowledgeCb?.(res);
        });
    } else if (event === 'getResourceState') {
      const req = request as Parameters<
        IOEvents<TState, TAction, TResourceType>['getResourceState']
      >[0];

      type ResponseType = ReturnType<
        IOEvents<TState, TAction, TResourceType>['getResourceState']
      >;

      this.masterResource
        .getState(req.rid, this.clientId)
        .resolve()
        .then((r) => {
          const res = {
            ok: r.ok,
            err: r.err,
            val: r.val,
          } as ReturnType<IOEvents<TState, TAction, TResourceType>[E]>;

          acknowledgeCb?.(res);
        });
    } else if (event === 'emitAction') {
      console.log('Mock', this.clientId, event, request);

      const req = request as Parameters<
        IOEvents<TState, TAction, TResourceType>['emitAction']
      >[0];

      // this.emit(req.action)

      this.masterResource
        .applyAction(req.rid, this.clientId, req.action)
        .resolve()
        .then((r) => {
          const res = {
            ok: r.ok,
            err: r.err,
            val: r.val,
          } as ReturnType<IOEvents<TState, TAction, TResourceType>[E]>;

          acknowledgeCb?.(res);
        });
    }

    return true;
  }

  emitAndAcknowledge<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    request: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0]
  ) {
    return new Promise<ReturnType<IOEvents<TState, TAction, TResourceType>[E]>>(
      (resolve) => {
        this.emit(event, request, resolve);
      }
    );
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
