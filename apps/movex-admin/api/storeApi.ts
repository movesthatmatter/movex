import { config } from '../config';
import { MovexStoreItemsRecord } from 'movex-store';
import { UnknownMovexDefinitionResourcesMap } from 'movex-core-util';

import storeMockData from '../_mockData/movex-store-2024-11-25.json';
import connectionsMockData from '../_mockData/movex-connections-2025-12-23.json';

export const fetchAllStore = async () => {
  if (config.MOCK_DATA) {
    return storeMockData;
  }

  const storeRes = await fetch(`${config.MOVEX_ENDPOINT}/store`);
  return await storeRes.json();
};

export const fetchResourcesOfType = async ({
  type,
}: {
  type: string;
}): Promise<
  MovexStoreItemsRecord<UnknownMovexDefinitionResourcesMap, typeof type>
> => {
  if (config.MOCK_DATA) {
    return storeMockData[
      type as keyof typeof storeMockData
    ] as unknown as MovexStoreItemsRecord<
      UnknownMovexDefinitionResourcesMap,
      typeof type
    >;
  }
  return (await fetchAllStore())[type] as MovexStoreItemsRecord<
    UnknownMovexDefinitionResourcesMap,
    typeof type
  >;
};

export const fetchConnections = async () => {
  if (config.MOCK_DATA) {
    return connectionsMockData;
  }

  const connectionsRes = await fetch(`${config.MOVEX_ENDPOINT}/connections`);
  return await connectionsRes.json();
};
