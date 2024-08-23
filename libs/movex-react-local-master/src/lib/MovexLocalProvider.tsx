import React from 'react';
import {
  invoke,
  type MovexClient as MovexClientUser,
  type MovexDefinition,
  type BaseMovexDefinitionResourcesMap,
  StringKeys,
  ResourceIdentifier,
  SanitizedMovexClient,
} from 'movex-core-util';
import {
  MovexMasterServer,
  MockConnectionEmitter,
  getUuid,
  ConnectionToClient, // This can actually be mocked here as it's just client only!
} from 'movex-master';
import { MovexClient } from 'movex';
import {
  MovexReactContext,
  MovexReactContextProps,
  MovexResourceObservablesRegistry,
  MovexReactContextPropsConnected,
  MovexReactContextPropsNotConnected,
  initialReactMovexContext,
} from 'movex-react';
import { MovexLocalContextConsumerProvider } from './MovexLocalContextConsumer';
import { orchestrateDefinedMovex } from './ClientMasterOrchestrator';

type Props<TResourcesMap extends BaseMovexDefinitionResourcesMap> =
  React.PropsWithChildren<{
    movexDefinition: MovexDefinition<TResourcesMap>;
    clientId?: MovexClientUser['id'];
    masterEmitDelayMs?: number;
    onConnected?: (
      state: MovexReactContextPropsConnected<TResourcesMap>
    ) => void;
    onDisconnected?: (state: MovexReactContextPropsNotConnected) => void;
  }>;

type State<TResourcesMap extends BaseMovexDefinitionResourcesMap> = {
  contextState: MovexReactContextProps<TResourcesMap>;
};

// * TODO: This could be moved out of the refular library into a separate one only for devs who don't look for multiplayer
export class MovexLocalProvider<
  TResourcesMap extends BaseMovexDefinitionResourcesMap
> extends React.Component<Props<TResourcesMap>, State<TResourcesMap>> {
  private unsubscribers: (() => void)[] = [];

  constructor(props: Props<TResourcesMap>) {
    super(props);

    this.state = {
      contextState: initialReactMovexContext,
    };
  }

  private orchestrate = (master: MovexMasterServer) => {
    // Clean up the prev event handlers in case it's called multiple times (which shouldnt)
    this.cleanUp();

    const clientWithInfo: SanitizedMovexClient<{}> = {
      id: this.props.clientId || getUuid(),
      info: {},
      clockOffset: 0,
    };

    // This should be defined as real source not just as a mock
    const emitterOnMaster = new MockConnectionEmitter(
      clientWithInfo.id,
      'master-emitter'
    );

    // TODO: This isn't reactive to changes in the props!
    if (this.props.masterEmitDelayMs) {
      emitterOnMaster._setEmitDelay(this.props.masterEmitDelayMs);
    }

    const connectionToClient = new ConnectionToClient(
      emitterOnMaster,
      clientWithInfo
    );

    const unsubscribeFromConnection =
      master.addClientConnection(connectionToClient);

    const mockedMovex = orchestrateDefinedMovex(
      this.props.movexDefinition,
      clientWithInfo.id,
      emitterOnMaster
    );

    // This resets each time movex re-initiates
    const resourceRegistry = new MovexResourceObservablesRegistry(
      mockedMovex.movex
    );

    const client = mockedMovex.movex.getClient();

    const nextState: MovexReactContextPropsConnected<TResourcesMap> = {
      status: 'connected',
      movex: mockedMovex.movex,
      client,
      movexDefinition: this.props.movexDefinition,
      bindResource: <TResourceType extends StringKeys<TResourcesMap>>(
        rid: ResourceIdentifier<TResourceType>,
        onStateUpdate: (p: MovexClient.MovexBoundResource) => void
      ) => {
        const $resource = resourceRegistry.register(rid);

        onStateUpdate(new MovexClient.MovexBoundResource($resource));

        return $resource.onUpdate(() => {
          onStateUpdate(new MovexClient.MovexBoundResource($resource));
        });
      },
    } as const;

    this.setState({
      contextState: nextState,
    });

    this.props.onConnected?.(nextState);

    this.unsubscribers = [
      ...this.unsubscribers,
      unsubscribeFromConnection,
      () => mockedMovex.destroy(),
    ];
  };

  private cleanUp() {
    this.unsubscribers.forEach(invoke);
    this.unsubscribers = [];
  }

  override componentWillUnmount(): void {
    this.cleanUp();
  }

  override render() {
    return (
      <>
        <MovexLocalContextConsumerProvider onMasterReady={this.orchestrate} />
        <MovexReactContext.Provider
          value={
            this.state
              .contextState as MovexReactContextProps<BaseMovexDefinitionResourcesMap>
          }
        >
          {this.props.children}
        </MovexReactContext.Provider>
      </>
    );
  }
}
