import React from 'react';
import type { MovexClient } from 'movex';
import {
  GetReducerState,
  GetReducerAction,
  ResourceIdentifier,
  MovexClient as MovexClientUser,
  StringKeys,
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
  UnsubscribeFn,
} from 'movex-core-util';
import { invoke, isSameResourceIdentifier } from 'movex-core-util';
import { MovexContextStateChange } from './MovexContextStateChange';

type ReactMovexBoundResource<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends StringKeys<TResourcesMap>
> = MovexClient.MovexBoundResource<
  GetReducerState<TResourcesMap[TResourceType]>,
  GetReducerAction<TResourcesMap[TResourceType]>
>;

type Props<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends StringKeys<TResourcesMap>
> = {
  movexDefinition: MovexDefinition<TResourcesMap>;
  rid: ResourceIdentifier<TResourceType>;
  onReady?: (p: {
    boundResource: ReactMovexBoundResource<TResourcesMap, TResourceType>;
    clientId: MovexClientUser['id'];
  }) => void;
  onComponentWillUnmount?: (p: State<TResourcesMap, TResourceType>) => void;
  onResourceStateUpdated?: (
    p: ReactMovexBoundResource<TResourcesMap, TResourceType>['state']
  ) => void;
  render: (p: {
    boundResource: ReactMovexBoundResource<TResourcesMap, TResourceType>;
    clientId: MovexClientUser['id'];
  }) => React.ReactNode;

  // Renders before Movex isReady - like Suspense
  fallback?: React.ReactNode;
};

type State<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends StringKeys<TResourcesMap>
> =
  | {
      init: false;
    }
  | {
      init: true;
      boundResource: ReactMovexBoundResource<TResourcesMap, TResourceType>;
      clientId: MovexClientUser['id'];
    };

export class MovexBoundResourceComponent<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends StringKeys<TResourcesMap>
> extends React.Component<
  Props<TResourcesMap, TResourceType>,
  State<TResourcesMap, TResourceType>
> {
  private unsubscribers: (() => void)[] = [];

  constructor(props: Props<TResourcesMap, TResourceType>) {
    super(props);

    this.state = {
      init: false,
    };
  }

  override componentDidUpdate(
    prevProps: Readonly<Props<TResourcesMap, TResourceType>>,
    prevState: Readonly<State<TResourcesMap, TResourceType>>
  ): void {
    // Reset the boundResource if the rid changed
    if (!isSameResourceIdentifier(prevProps.rid, this.props.rid)) {
      this.setState({ init: false });
    }

    // If the bound resource just got set
    if (prevState.init === false && this.state.init === true) {
      this.props.onReady?.(this.state);
    }
  }

  private init(
    // movex: MovexClient.MovexFromDefintion<TResourcesMap>,
    clientId: MovexClientUser['id'],
    bindResource: <TResourceType extends StringKeys<TResourcesMap>>(
      rid: ResourceIdentifier<TResourceType>,
      onStateUpdate: (p: MovexClient.MovexBoundResource) => void
    ) => UnsubscribeFn
  ) {
    if (this.state.init) {
      return;
    }

    this.unsubscribers = [
      ...this.unsubscribers,
      bindResource(this.props.rid, (boundResource) => {
        this.setState({ init: true, boundResource, clientId }, () => {
          this.props.onResourceStateUpdated?.(boundResource.state);
        });
      }),
    ];
  }

  override componentWillUnmount(): void {
    if (this.state.init) {
      // Remove the Local Observable Listeners when the component unmounts
      this.state.boundResource.destroy();
    }

    this.props.onComponentWillUnmount?.(this.state);

    this.unsubscribers.forEach(invoke);
  }

  override render() {
    return (
      <MovexContextStateChange
        // onMovexConnected={() => {

        // }}
        onChange={(r) => {
          if (!r.connected) {
            return;
          }

          this.init(
            // r.movex as MovexClient.MovexFromDefintion<TResourcesMap>,
            r.clientId,
            r.bindResource
          );
        }}
      >
        {this.state.init
          ? this.props.render(
              this.state as {
                boundResource: ReactMovexBoundResource<
                  TResourcesMap,
                  TResourceType
                >;
                clientId: MovexClientUser['id'];
              }
            )
          : this.props.fallback}
      </MovexContextStateChange>
    );
  }
}
