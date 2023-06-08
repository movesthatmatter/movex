import styled from '@emotion/styled';
import { PlayRPSButton } from '../../modules/rock-paper-scissors/RPSPlayButton';
import { MovexInstance } from '../../modules/movex/MovexInstance';
import { RPSWidget } from 'apps/movex-demo/modules/rock-paper-scissors/RPSWidget';
import {
  MovexLocalProviderClass,
  useCreateMovexResourceOnDemand,
} from 'movex-react';
import movexConfig from 'libs/movex-examples/src/movex.config';
import { useState } from 'react';
import { MovexClient, ResourceIdentifier } from 'movex-core-util';
import { Rps } from 'movex-examples';
import { MovexInstanceRender } from 'apps/movex-demo/modules/movex/MovexinstanceRender';

const StyledPage = styled.div`
  .page {
  }
`;

export function Index() {
  const [createdRid, setCreatedRid] = useState<ResourceIdentifier<string>>();
  const [clientId, setClientId] = useState<string>();

  /*
   * Replace the elements below with your own.
   *
   * Note: The corresponding styles are in the ./index.@emotion/styled file.
   */
  return (
    <StyledPage>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 40
        }}
      >
        <MovexLocalProviderClass
          clientId="client-1"
          movexDefinition={movexConfig}
          onConnected={(r) => {
            if (createdRid) {
              return;
            }

            if (r.connected) {
              // console.log('Client Created:', r.movex.getClientId());

              setClientId(r.clientId);
              // TODO: This needs to be typed. rps is any now
              r.movex
                .register('rps')
                .create(Rps.initialState)
                .map(({ rid }) => {
                  setCreatedRid(rid);
                });
            }
          }}
        >
          {clientId && createdRid && (
            <MovexInstanceRender
              rid={createdRid}
              movexDefinition={movexConfig}
              render={(boundResource) => (
                <Rps.Main
                  boundResource={boundResource as any}
                  userId={clientId}
                />
              )}
            />
          )}
        </MovexLocalProviderClass>

        {createdRid && (
          <div>
            here
            <MovexInstance
              clientId="client-b"
              movexDefinition={movexConfig}
              rid={createdRid}
              render={({ boundResource, clientId }) => (
                <Rps.Main
                  boundResource={boundResource as any}
                  userId={clientId}
                />
              )}
            />
            {/* TODO here we have an issue. Normally these 2 should be ableto be created simulatneously, but htey fail now, both taking the same slot 
          – maybe due to the fact that the master doesnt hae time to respond??? */}
            {/* <MovexInstance
            clientId="client-b"
            movexDefinition={movexConfig}
            rid={createdRid}
            render={({ boundResource, clientId }) => (
              <Rps.Main
                boundResource={boundResource as any}
                userId={clientId}
              />
            )}
          /> */}
          </div>
        )}
      </div>
    </StyledPage>
  );
}

export default Index;
