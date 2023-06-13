import React from 'react';
import { MovexClient, getUuid, invoke } from 'movex-core-util';
import {
  BaseMovexDefinitionResourcesMap,
  Master,
  MovexMasterLocal,
  MovexDefinition,
  MovexMasterServer,
} from 'movex';
import { MovexContext, MovexContextProps } from '../MovexContext';
import { MovexLocalContextConsumerProvider } from './MovexLocalContextConsumer';

type Props<TResourcesMap extends BaseMovexDefinitionResourcesMap> =
  React.PropsWithChildren<{
    movexDefinition: MovexDefinition<TResourcesMap>;
    clientId?: MovexClient['id'];
    onConnected?: (
      state: Extract<MovexContextProps<TResourcesMap>, { connected: true }>
    ) => void;
  }>;

type State<TResourcesMap extends BaseMovexDefinitionResourcesMap> = {
  contextState: MovexContextProps<TResourcesMap>;
};

// * TODO: This could be moved out of the refular library into a separate one only for devs who don't look for multiplayer
export class MovexLocalProviderClass<
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

    const emitterOnMaster = new MovexMasterLocal.MockConnectionEmitter(
      clientId,
      'master-emitter'
    );

    const connectionToClient = new Master.ConnectionToClient(
      clientId,
      emitterOnMaster
    );

    const unsubscribeFromConnection =
      master.addClientConnection(connectionToClient);

    const mockedMovex = MovexMasterLocal.orchestrateDefinedMovex(
      this.props.movexDefinition,
      clientId,
      emitterOnMaster
    );

    const nextState = {
      connected: true,
      movex: mockedMovex.movex,
      clientId: mockedMovex.movex.getClientId(),
      movexDefinition: this.props.movexDefinition,
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

        <MovexContext.Provider
          value={
            this.state
              .contextState as MovexContextProps<BaseMovexDefinitionResourcesMap>
          }
        >
          {this.props.children}
        </MovexContext.Provider>
      </>
    );
  }
}
