import { toRidAsStr } from 'movex';
import movexConfig from 'movex-examples';
import { useMovexResourceType } from 'movex-react';
import { useRouter } from 'next/router';

export default function HomeCounter() {
  const router = useRouter();
  const counterResource = useMovexResourceType(movexConfig, 'counter');

  const { userId } = router.query;
  // console.log('query', router.query);

  if (!(typeof userId === 'string' && userId)) {
    return <>No User Given in the search params</>;
  }

  return (
    <button
      onClick={() => {
        console.log('clicked', counterResource);

        counterResource
          ?.create({
            value: 0,
          })
          .map((s) => {
            router.push(`learn/${toRidAsStr(s.rid)}?userId=${userId}`);
          });
      }}
    >
      Create Resource
    </button>
  );
}
