import { MovexClient, MovexClientConfig } from './MovexClient';
import { MovexResource } from './MovexResource';
import { GenericAction, MovexState } from './types';
import { computeCheckedState } from './util';
import io, { Socket } from 'socket.io-client';

// Type Resource Reducers
type ResourceReducer<TType extends string, TState extends MovexState> = {
  type: TType;
  defaultState: TState;
  // TOOD: Ideally this state can be inferred
  actionsMap: Record<string, (state: TState, action: GenericAction) => TState>;
};

type GenericResourceReducer = ResourceReducer<string, MovexState>;

export const createMovexInstance = (
  config: MovexClientConfig & {},
  resourceReducers: GenericResourceReducer[],
  ioClient?: Socket
) => {
  // This is ued like this so it can be tested!
  const socket =
    ioClient ||
    io(config.url, {
      reconnectionDelay: 1000,
      reconnection: true,
      transports: ['websocket'],
      agent: false,
      upgrade: true,
      rejectUnauthorized: false,
      query: {
        ...(config.clientId ? { clientId: config.clientId } : {}),
        apiKey: config.apiKey, // This could change
      },
      autoConnect: false,
    });

  const client = new MovexClient(socket, config);

  // client.
  const resourcesMap = resourceReducers.reduce((accum, nextReducer) => {
    return {
      ...accum,
      [nextReducer.type]: new MovexResource(
        nextReducer.actionsMap,
        computeCheckedState(nextReducer.defaultState)
      ),
    };
  }, {} as Record<string, MovexResource<MovexState, any>>);

  return {
    client,

    // TODO: If I can infer this from the given reducers it would be amazing!
    //  If not I have to pass in some weird action maps
    resources: resourcesMap,
  };
};
