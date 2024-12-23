import type { InferGetStaticPropsType, GetStaticProps } from 'next';
import DefaultLayout from 'apps/movex-admin/components/Layouts/DefaultLayout';
import { fetchAllStore } from 'apps/movex-admin/api/storeApi';
import { ResourcesView } from 'apps/movex-admin/modules/Resources/ResourcesView';
import Breadcrumb from 'apps/movex-admin/components/Breadcrumbs/Breadcrumb';

export const getStaticProps = (async (context) => {
  return {
    props: {
      store: await fetchAllStore(),
    },
  };
}) satisfies GetStaticProps<any>;

export default function Page({
  store,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Resources" />
      <ResourcesView store={store} />
    </DefaultLayout>
  );
}
