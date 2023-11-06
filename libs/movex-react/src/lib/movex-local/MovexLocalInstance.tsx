import React from 'react';
import type {
  MovexClient,
  StringKeys,
  MovexDefinition,
  BaseMovexDefinitionResourcesMap,
} from  'movex-core-util';
import type { MovexContextProps } from '../MovexContext';
import { MovexLocalProvider } from './MovexLocalProvider';

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
  TResourceType extends StringKeys<TResourcesMap>
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
