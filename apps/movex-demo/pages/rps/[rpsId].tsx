import { MovexBoundResource, MovexProvider } from 'movex-react';
import movexConfig from 'libs/movex-examples/src/movex.config';
import { useState } from 'react';
import { ResourceIdentifier } from 'movex-core-util';
import { Rps } from 'movex-examples';
import { useRouter } from 'next/router';
import { RPSUi } from 'apps/movex-demo/modules/rock-paper-scissors/RPSUi';

export function Index() {
  const [rpsRid, setRpsRid] = useState<ResourceIdentifier<'rps'>>();
  const { rpsId, user, backgroundColor } = useRouter().query;

  console.log('backgroundColor 2', backgroundColor);

  if (
    !(rpsId && typeof rpsId === 'string' && user && typeof user === 'string')
  ) {
    return null;
  }

  return (
    <>
      <MovexProvider
        endpointUrl="localhost:3333"
        clientId={user}
        movexDefinition={movexConfig}
        onConnected={(movex) => {
          const reg = movex.register('rps');

          reg
            .get({
              resourceId: rpsId,
              resourceType: 'rps',
            })
            .flatMapErr(() => reg.create(Rps.initialState, rpsId))
            .map(({ rid }) => {
              setRpsRid(rid);
            });
        }}
      >
        {rpsRid && (
          <MovexBoundResource
            rid={rpsRid}
            movexDefinition={movexConfig}
            render={({ boundResource, clientId }) => (
              <RPSUi
                boundResource={boundResource}
                userId={clientId}
                backgroundColor={
                  typeof backgroundColor === 'string'
                    ? backgroundColor
                    : undefined
                }
              />
            )}
          />
        )}
      </MovexProvider>
    </>
  );
}

export default Index;
