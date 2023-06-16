import React from 'react';
import { MovexLocalProvider } from 'movex-react';
import {
  MovexDefinition,
  Client,
  BaseMovexDefinitionResourcesMap,
  GetReducerState,
  GetReducerAction,
} from 'movex';
import { MovexClient, ResourceIdentifier } from 'movex-core-util';
import { MovexLocalInstanceRender } from './MovexLocalInstanceRender';
import { MovexResource } from 'libs/movex/src/lib/client';

type Props<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends Extract<keyof TResourcesMap, string>
> = React.PropsWithChildren<{
  movexDefinition: MovexDefinition<TResourcesMap>;
  resourceType: TResourceType;
  rid?: ResourceIdentifier<TResourceType>;
  render: (p: {
    boundResource: Client.MovexBoundResource<
      GetReducerState<TResourcesMap[TResourceType]>,
      GetReducerAction<TResourcesMap[TResourceType]>
    >;
    clientId: MovexClient['id'];
  }) => React.ReactNode;
  clientId?: string;
  onRegistered?: (
    // state: Pick<Extract<MovexContextProps<TResourcesMap>, { connected: true }>, 'movex'>
    resource: MovexResource<
      GetReducerState<TResourcesMap[TResourceType]>,
      GetReducerAction<TResourcesMap[TResourceType]>,
      TResourceType
    >
  ) => void;
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

          this.props.onRegistered?.(r.movex.register(this.props.resourceType));
        }}
      >
        {clientId && this.props.rid && (
          <MovexLocalInstanceRender
            movexDefinition={this.props.movexDefinition}
            rid={this.props.rid}
            render={(boundResource) =>
              this.props.render({
                boundResource,
                clientId,
              })
            }
          />
        )}
      </MovexLocalProvider>
    );
  }
}
