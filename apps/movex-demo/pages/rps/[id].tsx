import { useMovexBoundResource, useMovexClientId } from 'movex-react';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { toResourceIdentifierObj } from 'movex-core-util';
import movexConfig from 'apps/movex-demo/movex.config';
import { RPSGame } from 'apps/movex-demo/modules/rock-paper-scissors/RPSGame';

type Props = {};

const RPSGamePage: React.FC<Props> = () => {
  const { id } = useRouter().query;

  const rid = useMemo(
    () =>
      toResourceIdentifierObj({
        resourceId: (id as string) || '',
        resourceType: 'rps', // TODO: This could be automated somehow. Either by using the ridStr instead of id or by knowing how to reconstruct it
      }),
    [id]
  );

  // TODO: Validate the rid is correct inside useMovexBoundResouce
  const boundResource = useMovexBoundResource(movexConfig, rid);
  const userId = useMovexClientId();

  if (!(boundResource && userId)) {
    return null;
  }

  return <RPSGame boundResource={boundResource} userId={userId} />;
};

export default RPSGamePage;
