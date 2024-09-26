import React from 'react';
import type {
  MovexClient,
  StringKeys,
  MovexDefinition,
  BaseMovexDefinitionResourcesMap,
} from 'movex-core-util';
import type { MovexContextProps } from './MovexContext';
import { MovexProvider, MovexProviderProps } from './MovexProvider';

type Props<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends Extract<keyof TResourcesMap, string>
> = React.PropsWithChildren<
  Omit<
    MovexProviderProps<TResourcesMap>,
    'movexDefinition' | 'onConnected' | 'onDisconnected'
  > & {
    movexDefinition: MovexDefinition<TResourcesMap>;
    onConnectionStatusChange?: MovexProviderProps<TResourcesMap>['onConnectionStatusChange'];
  }
>;

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
  override render() {
    const { onConnectionStatusChange, ...props } = this.props;

    return (
      <MovexProvider
        {...(onConnectionStatusChange && {
          onConnectionStatusChange: (r) => {
            onConnectionStatusChange(r as MovexContextProps<TResourcesMap>);
          },
        })}
        {...props}
      />
    );
  }
}
