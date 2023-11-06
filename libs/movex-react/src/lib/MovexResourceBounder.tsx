import type React from 'react';
import { useMovexBoundResourceFromRid, useMovexClientId } from './hooks';
import type { MovexClient } from 'movex';
import type { ResourceIdentifier, MovexDefinition } from 'movex-core-util';

type Props = React.PropsWithChildren<{
  movexDefinition: MovexDefinition;
  rid: ResourceIdentifier<string>;
  render: (boundResource: MovexClient.MovexBoundResource) => React.ReactNode;
}>;

export const MovexResourceBounder: React.FC<Props> = (props) => {
  const clientId = useMovexClientId(props.movexDefinition);
  const boundResource = useMovexBoundResourceFromRid(
    props.movexDefinition,
    props.rid
  );

  return <>{clientId && boundResource && props.render(boundResource)}</>;
};
