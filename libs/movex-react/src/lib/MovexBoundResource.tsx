import React from 'react';
import { bindResource } from 'movex-react';
import {
  MovexDefinition,
  MovexClient,
  BaseMovexDefinitionResourcesMap,
  GetReducerState,
  GetReducerAction,
} from 'movex';
import {
  ResourceIdentifier,
  StringKeys,
  invoke,
  isSameResourceIdentifier,
  toResourceIdentifierObj,
  MovexClient as MovexClientUser,
} from 'movex-core-util';
import { MovexContextStateChange } from './MovexContextStateChange';

type Props<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends StringKeys<TResourcesMap>
> = {
  movexDefinition: MovexDefinition<TResourcesMap>;
  rid: ResourceIdentifier<TResourceType>;
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
> = {
  boundResource?: MovexClient.MovexBoundResource<
    GetReducerState<TResourcesMap[TResourceType]>,
    GetReducerAction<TResourcesMap[TResourceType]>
  >;
  clientId?: MovexClientUser['id'];
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

    this.state = {};
  }

  override componentDidUpdate(
    prevProps: Readonly<Props<TResourcesMap, TResourceType>>
  ): void {
    // Reset the boundResource if the rid changed
    if (!isSameResourceIdentifier(prevProps.rid, this.props.rid)) {
      this.setState({ boundResource: undefined });
    }
  }

  private registerAndBoundResourceIfNotAlready(
    movex: MovexClient.MovexFromDefintion<TResourcesMap>,
    clientId: MovexClientUser['id']
  ) {
    if (this.state.boundResource) {
      return;
    }

    const { resourceType } = toResourceIdentifierObj(this.props.rid);

    this.unsubscribers = [
      ...this.unsubscribers,
      bindResource(
        movex.register(resourceType),
        this.props.rid,
        (boundResource) => this.setState({ boundResource, clientId })
      ),
    ];
  }

  override componentWillUnmount(): void {
    this.unsubscribers.forEach(invoke);
  }

  override render() {
    const state = this.state;

    return (
      <MovexContextStateChange
        onChange={(r) => {
          if (!r.connected) {
            return;
          }

          this.registerAndBoundResourceIfNotAlready(
            r.movex as MovexClient.MovexFromDefintion<TResourcesMap>,
            r.clientId
          );
        }}
      >
        {this.state.boundResource &&
          this.props.render(
            state as {
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
