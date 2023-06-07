import { useMovexResource } from 'movex-react';
import { initialState } from '../../modules/rock-paper-scissors/rockPaperScissors.movex';
import { DemoMovexDefinition } from 'apps/movex-demo/movex';
import Link from 'next/link';
import { useRouter } from 'next/router';

type Props = {};

export const PlayRPSButton: React.FC<Props> = () => {
  const rpsResource = useMovexResource<DemoMovexDefinition>('rps');
  const router = useRouter();

  if (!rpsResource) {
    return null;
  }

  return (
    <div>
      <button
        onClick={() => {
          rpsResource.create(initialState).map((item) => {
            // window.location.href =
            //   window.location.origin + `/rps/${item.rid.resourceId}` ;

            router.push(`/rps/${item.rid.resourceId}`);
          });
        }}
      >
        Play Rock Paper Scissors
      </button>
    </div>
  );
};
