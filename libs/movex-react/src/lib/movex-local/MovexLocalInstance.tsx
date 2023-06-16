import React from 'react';
import { MovexContextProps, MovexLocalProvider } from 'movex-react';
import { MovexDefinition, BaseMovexDefinitionResourcesMap } from 'movex';
import { MovexClient } from 'movex-core-util';

type Props<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends Extract<keyof TResourcesMap, string>
> = React.PropsWithChildren<{
  movexDefinition: MovexDefinition<TResourcesMap>;
  clientId?: string;
  onConnected?: (
    state: Extract<
      MovexContextProps<TResourcesMap>,
      { connected: true }
    >['movex']
  ) => void;
  onDisconnected?: () => void;
}>;

type State = {
  clientId?: MovexClient['id'];
};

export class MovexLocalInstance<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends Extract<keyof TResourcesMap, string>
> extends React.Component<Props<TResourcesMap, TResourceType>, State> {
  constructor(props: Props<TResourcesMap, TResourceType>) {
    super(props);

    this.state = {};
  }

  override render() {
    const { clientId } = this.state;

    return (
      <MovexLocalProvider
        clientId={this.props.clientId}
        movexDefinition={this.props.movexDefinition}
        onConnected={(r) => {
          this.setState({ clientId: r.clientId });

          this.props.onConnected?.(r.movex);
        }}
        onDisconnected={() => {
          this.setState({ clientId: undefined });

          this.props.onDisconnected?.();
        }}
      >
        {/* {clientId && this.props.rid && ( */}
        {clientId && <>{this.props.children}</>}
      </MovexLocalProvider>
    );
  }
}
