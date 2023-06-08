import { useMovex, useMovexBindOrCreateAndBindOnDemand } from 'movex-react';
import { ResourceIdentifier } from 'movex-core-util';
import movexConfig, { Rps } from 'movex-examples';
import { useState } from 'react';

type Props = {
  rid?: ResourceIdentifier<'rps'>; // TODO: this can be typed better as well by using a ResourceIdentifier From definition
};

export const RPSWidget: React.FC<Props> = (props) => {
  // const d = useMovexBoundResource(props.rid);

  // d.state
  // useCreateAndBindResource('rps', (bound) => {
  //   bound.dispatch({
  //     type: ''
  //   })
  // }, [])
  const [x] = useState({
    state: Rps.initialState,
    type: 'rps',
  } as const);

  const movex = useMovex();

  const b = useMovexBindOrCreateAndBindOnDemand(movexConfig, props.rid || x);

  if (!movex.clientId) {
    return <>no client yet</>;
  }

  if (!b) {
    return <>no tenemos b</>;
  }

  return (
    <div>
      <Rps.Main boundResource={b} userId={movex.clientId} />
    </div>
  );
};
