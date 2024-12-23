import type { InferGetStaticPropsType, GetStaticProps } from 'next';
import ECommerce from '../components/Dashboard/E-commerce';
import DefaultLayout from '../components/Layouts/DefaultLayout';
import { objectKeys } from 'movex-core-util';
import { MovexStoreData } from '../types/store';
import { fetchConnections, fetchAllStore } from '../api/storeApi';

export const getStaticProps = (async (context) => {
  const store = await fetchAllStore();
  const connections = await fetchConnections();

  return {
    props: {
      connections: {
        count: Object.keys(connections).length,
      },
      resources: objectKeys(store).reduce((prev, resourceType) => {
        // console.log('store[resource].subscribers', store[resource]);
        return {
          ...prev,
          [resourceType]: {
            resourceType,
            subscribersCount: 0,
            totalCount: Object.keys(store[resourceType]).length,
            activeCount: objectKeys(store[resourceType]).reduce(
              (prev: number, next) =>
                prev +
                Object.keys(store[resourceType][next].subscribers).length,
              0
            ),
            // isActive: Object.keys(store[resource][store[resource].rid].subscribers).length > 0,
            // isActive: 0,
          },
        };
      }, {} satisfies MovexStoreData['resources']),
    },
  };
}) satisfies GetStaticProps<MovexStoreData>;

export default function Home(
  props: InferGetStaticPropsType<typeof getStaticProps>
) {
  return (
    <DefaultLayout>
      <ECommerce {...props} />
    </DefaultLayout>
  );
}
