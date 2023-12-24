import { CounterPanel } from 'apps/movex-demo/modules/counter/CounterPanel';
import {
  ResourceIdentifier,
  isResourceIdentifier,
  isResourceIdentifierOfType,
} from 'movex-core-util';
import movexConfig from 'movex-examples';
import { MovexBoundResource } from 'movex-react';
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function Index() {
  // const [rpsRid, setRpsRid] = useState<ResourceIdentifier<'counter'>>();
  const { userId, rid, ...query } = useRouter().query;

  if (
    !(
      userId &&
      typeof userId === 'string' &&
      isResourceIdentifierOfType('counter', rid)
    )
  ) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
      }}
    >
      <CounterPanel rid={rid} />
      <CounterPanel rid={rid} />
      <CounterPanel rid={rid} />
      <CounterPanel rid={rid} />
    </div>
  );
}
