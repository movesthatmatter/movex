import type React from 'react';
import { useMovexBoundResourceFromRid, useMovexClient } from './hooks';
import type { MovexClient } from 'movex';
import type { ResourceIdentifier, MovexDefinition } from  'movex-core-util';

type Props = React.PropsWithChildren<{
  movexDefinition: MovexDefinition;
  rid: ResourceIdentifier<string>;
  render: (boundResource: MovexClient.MovexBoundResource) => React.ReactNode;
}>;

export const MovexResourceBounder: React.FC<Props> = (props) => {
  const clientId = useMovexClient(props.movexDefinition)?.id;
  const boundResource = useMovexBoundResourceFromRid(
    props.movexDefinition,
    props.rid
  );

  return <>{clientId && boundResource && props.render(boundResource)}</>;
};
