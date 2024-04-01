import React from 'react';
import {
  invoke,
  ConnectionToClient,
  type MovexClient,
  type MovexDefinition,
  type BaseMovexDefinitionResourcesMap,
} from 'movex-core-util';
import {
  MovexMasterServer,
  MockConnectionEmitter,
  orchestrateDefinedMovex,
  getUuid, // This can actually be mocked here as it's just client only!
} from 'movex-master';
import { MovexReactContext, MovexReactContextProps } from 'movex-react';
import { MovexLocalContextConsumerProvider } from './MovexLocalContextConsumer';

type Props<TResourcesMap extends BaseMovexDefinitionResourcesMap> =
  React.PropsWithChildren<{
    movexDefinition: MovexDefinition<TResourcesMap>;
    clientId?: MovexClient['id'];
    onConnected?: (
      state: Extract<MovexReactContextProps<TResourcesMap>, { connected: true }>
    ) => void;
    onDisconnected?: (
      state: Extract<
        MovexReactContextProps<TResourcesMap>,
        { connected: false }
      >
    ) => void;
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
      contextState: {
        connected: false,
        clientId: undefined,
      },
    };
  }

  private orchestrate = (master: MovexMasterServer) => {
    // Clean up the prev event handlers in case it's called multiple times (which shouldnt)
    this.cleanUp();

    const clientId = this.props.clientId || getUuid();

    // This should be defined as real source not just as a mock
    const emitterOnMaster = new MockConnectionEmitter(
      clientId,
      'master-emitter'
    );

    const connectionToClient = new ConnectionToClient(
      clientId,
      emitterOnMaster
    );

    const unsubscribeFromConnection =
      master.addClientConnection(connectionToClient);

    const mockedMovex = orchestrateDefinedMovex(
      this.props.movexDefinition,
      clientId,
      emitterOnMaster
    );

    const nextState = {
      connected: true,
      movex: mockedMovex.movex,
      clientId: mockedMovex.movex.getClientId(),
      movexDefinition: this.props.movexDefinition,
      bindResource: () => () => {}, // Added this on Apr 01 2024, w/o testing - not sure it doesn't create more issues but needed it for tsc
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
