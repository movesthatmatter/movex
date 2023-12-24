import { MovexBoundResource } from 'movex-react';
import movexConfig from 'libs/movex-examples/src/movex.config';
import { useState } from 'react';
import { ResourceIdentifier } from 'movex-core-util';
import { Rps } from 'movex-examples';
import { useRouter } from 'next/router';
import { toRidAsStr } from 'movex';
import { RPSUi } from 'apps/movex-demo/modules/rock-paper-scissors/RPSUi';
import {
  MovexLocalInstance,
  MovexLocalMasterProvider,
} from 'movex-react-local-master';

export function Index() {
  const [rpsRid, setRpsRid] = useState<ResourceIdentifier<'rps'>>();
  const { rpsId, user } = useRouter().query;

  if (
    !(rpsId && typeof rpsId === 'string' && user && typeof user === 'string')
  ) {
    return null;
  }

  return (
    <MovexLocalMasterProvider movexDefinition={movexConfig}>
      <MovexLocalInstance
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
              <div className="w-full">
                <div className="">
                  <RPSUi boundResource={boundResource} userId={clientId} />
                </div>
                <div className="bg-slate-100">
                  <span>rid: {toRidAsStr(rpsRid)}</span>
                  <span>{'    '}</span>
                  <span>user: {clientId}</span>
                </div>
              </div>
            )}
          />
        )}
      </MovexLocalInstance>
    </MovexLocalMasterProvider>
  );
}

export default Index;
