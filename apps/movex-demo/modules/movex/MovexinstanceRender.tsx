import React from 'react';
import { useMovexBoundResourceFromRid } from 'movex-react';
import { MovexDefinition } from 'movex';
import { ResourceIdentifier } from 'movex-core-util';
import { MovexBoundResource } from 'libs/movex/src/lib/client';

type Props = React.PropsWithChildren<{
  movexDefinition: MovexDefinition;
  rid: ResourceIdentifier<string>;
  render: (boundResource: MovexBoundResource) => React.ReactNode;
}>;

export const MovexInstanceRender: React.FC<Props> = (props) => {
  const boundResource = useMovexBoundResourceFromRid(
    props.movexDefinition,
    props.rid
  );

  return <>{boundResource && props.render(boundResource)}</>;
};
