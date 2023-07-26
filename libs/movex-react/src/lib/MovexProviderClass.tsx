import React from 'react';
import { MovexDefinition, BaseMovexDefinitionResourcesMap } from 'movex';
import { MovexClient, StringKeys } from 'movex-core-util';
import { MovexContextProps } from './MovexContext';
import { MovexProvider } from './MovexProvider';

type Props<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends Extract<keyof TResourcesMap, string>
> = React.PropsWithChildren<{
  movexDefinition: MovexDefinition<TResourcesMap>;
  endpointUrl: string;
  clientId?: MovexClient['id'];
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

/**
 * This is just a wrapper around the Provider in order to get the correct types,
 * since the function based component cannot work with generics
 * */
export class MovexProviderClass<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends StringKeys<TResourcesMap>
> extends React.Component<Props<TResourcesMap, TResourceType>, State> {
  constructor(props: Props<TResourcesMap, TResourceType>) {
    super(props);

    this.state = {};
  }

  override render() {
    return (
      <MovexProvider
        endpointUrl={this.props.endpointUrl}
        clientId={this.props.clientId}
        movexDefinition={this.props.movexDefinition}
        onConnected={(r) => {
          this.setState({ clientId: r.clientId });

          this.props.onConnected?.(
            r.movex as Extract<
              MovexContextProps<TResourcesMap>,
              { connected: true }
            >['movex']
          );
        }}
        // onDisconnected={() => {
        //   this.setState({ clientId: undefined });

        //   this.props.onDisconnected?.();
        // }}
      >
        {this.props.children}
      </MovexProvider>
    );
  }
}
