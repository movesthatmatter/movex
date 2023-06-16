import { useMovexResourceType } from 'movex-react';
import movexConfig from 'movex-examples';
import { useRouter } from 'next/router';
import { Rps } from 'movex-examples';

type Props = {};

export const PlayRPSButton: React.FC<Props> = () => {
  const rpsResource = useMovexResourceType(movexConfig, 'rps');
  const router = useRouter();

  if (!rpsResource) {
    return null;
  }

  return (
    <div>
      <button
        onClick={() => {
          rpsResource.create(Rps.initialState).map((item) => {
            router.push(`/rps/${item.rid.resourceId}`);
          });
        }}
      >
        Play Rock Paper Scissors
      </button>
    </div>
  );
};
