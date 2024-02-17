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

  const movexService = useMovex(movexConfig);

  if (movexService.connected) {
    // TODO: Fix this
    movexService.movex.register('rps')
  }

  const b = useMovexBindOrCreateAndBindOnDemand(movexConfig, props.rid || x);

  if (!movexService.clientId) {
    return <>no client yet</>;
  }

  if (!b) {
    return <>no tenemos b</>;
  }

  return (
    <div>
      <Rps.Main boundResource={b} userId={movexService.clientId} />
    </div>
  );
};
