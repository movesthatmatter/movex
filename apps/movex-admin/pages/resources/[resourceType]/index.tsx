import type { InferGetStaticPropsType, GetStaticProps } from 'next';
import DefaultLayout from 'apps/movex-admin/components/Layouts/DefaultLayout';
import {
  fetchAllStore,
  fetchResourcesOfType,
} from 'apps/movex-admin/api/storeApi';
import { objectKeys } from 'movex-core-util';
import { StoreItem } from '../../../modules/Resources/components/StoreItem';
import Breadcrumb from 'apps/movex-admin/components/Breadcrumbs/Breadcrumb';

export const getStaticProps = (async (context) => {
  const resorceType = context.params?.['resourceType'] as string;

  return {
    props: {
      resources: await fetchResourcesOfType({ type: resorceType }),
      resorceType,
    },
  };
}) satisfies GetStaticProps<any>;

export async function getStaticPaths() {
  const store = await fetchAllStore();

  const paths = Object.keys(store).map((resourceType) => ({
    params: { resourceType },
  }));

  return { paths, fallback: false };
}

export default function Page({
  resources,
  resorceType,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <DefaultLayout>
      <Breadcrumb pageName={`Resource: ${resorceType}`} />
      <h3 className="text-xl pb-3">
        <span className="">{Object.keys(resources).length} items</span>
      </h3>
      <hr />
      {objectKeys(resources).map((key) => (
        <StoreItem key={key} item={resources[key]} />
      ))}
    </DefaultLayout>
  );
}
