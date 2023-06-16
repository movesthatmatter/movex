import styled from '@emotion/styled';
import { MovexLocalInstance } from 'movex-react';
import movexConfig from 'libs/movex-examples/src/movex.config';
import { useState } from 'react';
import { ResourceIdentifier } from 'movex-core-util';
import { Rps } from 'movex-examples';

const StyledPage = styled.div`
  .page {
  }
`;

export function Index() {
  const [createdRid, setCreatedRid] = useState<ResourceIdentifier<'rps'>>();

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
          gap: 40,
        }}
      >
        <MovexLocalInstance
          clientId="client-1"
          movexDefinition={movexConfig}
          resourceType="rps"
          rid={createdRid}

          // TODO Tthi should actually be another component MovexBoundResource w props.onRegistered, so there can be multiple resources used per local instance
          onRegistered={(r) => {
            console.log('on registerd', r);

            if (createdRid) {
              return;
            }

            console.log('craeting rid');

            r.create(Rps.initialState).map(({ rid }) => {
              setCreatedRid(rid);
            });
          }}
          render={(r) => (
            <Rps.Main boundResource={r.boundResource} userId={r.clientId} />
          )}
        />

        {createdRid && (
          <div>
            <MovexLocalInstance
              clientId="client-b"
              movexDefinition={movexConfig}
              resourceType="rps"
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
