import { MovexStoreItemsRecord } from 'movex-store';
import { UnknownMovexDefinitionResourcesMap } from 'movex-core-util';

export const fetchAllStore = async (url?: string) => {
  // console.log('Fetching from', url);

  if (!url) {
    return {};
  }

  const storeRes = await fetch(`${url}/store`);
  return await storeRes.json();
};

export const fetchResourcesOfType = async (
  url: string,
  {
    type,
  }: {
    type: string;
  }
): Promise<
  MovexStoreItemsRecord<UnknownMovexDefinitionResourcesMap, typeof type>
> => {
  console.log('fetchResourcesOfType url', url);
  // if (config.MOCK_DATA) {
  //   return storeMockData[
  //     type as keyof typeof storeMockData
  //   ] as unknown as MovexStoreItemsRecord<
  //     UnknownMovexDefinitionResourcesMap,
  //     typeof type
  //   >;
  // }
  return (await fetchAllStore(url))[type] as MovexStoreItemsRecord<
    UnknownMovexDefinitionResourcesMap,
    typeof type
  >;
};

export const fetchConnections = async (url?: string) => {
  if (!url) {
    return [];
  }

  const connectionsRes = await fetch(`${url}/connections`);
  return await connectionsRes.json();
};
