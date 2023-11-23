import React from 'react';
import { bindResource } from './hooks';
import type { MovexClient } from 'movex';
import type {
  GetReducerState,
  GetReducerAction,
  ResourceIdentifier,
  MovexClient as MovexClientUser,
  StringKeys,
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
} from 'movex-core-util';
import {
  invoke,
  isSameResourceIdentifier,
  toResourceIdentifierObj,
} from 'movex-core-util';
import { MovexContextStateChange } from './MovexContextStateChange';

type Props<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends StringKeys<TResourcesMap>
> = {
  movexDefinition: MovexDefinition<TResourcesMap>;
  rid: ResourceIdentifier<TResourceType>;
  onReady?: (p: {
    boundResource: MovexClient.MovexBoundResource<
      GetReducerState<TResourcesMap[TResourceType]>,
      GetReducerAction<TResourcesMap[TResourceType]>
    >;
    clientId: MovexClientUser['id'];
  }) => void;
  onResourceStateUpdated?: (
    p: MovexClient.MovexBoundResource<
      GetReducerState<TResourcesMap[TResourceType]>,
      GetReducerAction<TResourcesMap[TResourceType]>
    >['state']
  ) => void;
  render: (p: {
    boundResource: MovexClient.MovexBoundResource<
      GetReducerState<TResourcesMap[TResourceType]>,
      GetReducerAction<TResourcesMap[TResourceType]>
    >;
    clientId: MovexClientUser['id'];
  }) => React.ReactNode;
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
      boundResource: MovexClient.MovexBoundResource<
        GetReducerState<TResourcesMap[TResourceType]>,
        GetReducerAction<TResourcesMap[TResourceType]>
      >;
      clientId: MovexClientUser['id'];
    };

export class MovexBoundResource<
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
    movex: MovexClient.MovexFromDefintion<TResourcesMap>,
    clientId: MovexClientUser['id']
  ) {
    if (this.state.init) {
      return;
    }

    const { resourceType } = toResourceIdentifierObj(this.props.rid);

    this.unsubscribers = [
      ...this.unsubscribers,
      bindResource(
        movex.register(resourceType),
        this.props.rid,
        (boundResource) => {
          this.setState({ init: true, boundResource, clientId }, () => {
            this.props.onResourceStateUpdated?.(boundResource.state);
          });
        }
      ),
    ];
  }

  override componentWillUnmount(): void {
    this.unsubscribers.forEach(invoke);
  }

  override render() {
    return (
      <MovexContextStateChange
        onChange={(r) => {
          if (!r.connected) {
            return;
          }

          this.init(
            r.movex as MovexClient.MovexFromDefintion<TResourcesMap>,
            r.clientId
          );
        }}
      >
        {this.state.init &&
          this.props.render(
            this.state as {
              boundResource: MovexClient.MovexBoundResource<
                GetReducerState<TResourcesMap[TResourceType]>,
                GetReducerAction<TResourcesMap[TResourceType]>
              >;
              clientId: MovexClientUser['id'];
            }
          )}
      </MovexContextStateChange>
    );
  }
}
