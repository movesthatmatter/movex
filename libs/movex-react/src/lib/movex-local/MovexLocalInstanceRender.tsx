import React from 'react';
import { useMovexBoundResourceFromRid } from 'movex-react';
import { MovexDefinition, MovexClient } from 'movex';
import { ResourceIdentifier } from 'movex-core-util';

type Props = React.PropsWithChildren<{
  movexDefinition: MovexDefinition;
  rid: ResourceIdentifier<string>;
  render: (boundResource: MovexClient.MovexBoundResource) => React.ReactNode;
}>;

export const MovexLocalInstanceRender: React.FC<Props> = (props) => {
  const boundResource = useMovexBoundResourceFromRid(
    props.movexDefinition,
    props.rid
  );

  return <>{boundResource && props.render(boundResource)}</>;
};
