import React, { useEffect, useState } from 'react';
import { MovexLocalProvider, useMovexBoundResourceFromRid } from 'movex-react';
import { MovexDefinition } from 'movex';
import { MovexClient, ResourceIdentifier } from 'movex-core-util';
import { MovexBoundResource } from 'libs/movex/src/lib/client';
import { MovexInstanceRender } from './MovexinstanceRender';

type Props = React.PropsWithChildren<{
  movexDefinition: MovexDefinition;
  rid: ResourceIdentifier<string>;
  render: (p: {
    boundResource: MovexBoundResource;
    clientId: MovexClient['id'];
  }) => React.ReactNode;
  clientId?: string;
}>;

export const MovexInstance: React.FC<Props> = ({ render, ...props }) => {
  const [clientId, setClientId] = useState<MovexClient['id']>();

  return (
    <MovexLocalProvider
      clientId={props.clientId}
      movexDefinition={props.movexDefinition}
      onConnected={(r) => {
        console.log('Client Connected:', r.movex.getClientId());

        setClientId(r.clientId);
      }}
    >
      {clientId && (
        <MovexInstanceRender
          {...props}
          render={(boundResource) => render({ boundResource, clientId })}
        />
      )}
    </MovexLocalProvider>
  );
};
