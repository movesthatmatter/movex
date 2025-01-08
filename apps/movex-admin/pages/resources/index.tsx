import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import DefaultLayout from 'apps/movex-admin/components/Layouts/DefaultLayout';
import { fetchAllStore } from 'apps/movex-admin/api/storeApi';
import { ResourcesView } from 'apps/movex-admin/modules/Resources/ResourcesView';
import Breadcrumb from 'apps/movex-admin/components/Breadcrumbs/Breadcrumb';
import { getCookieFromRequest } from 'apps/movex-admin/lib/misc';

export const getServerSideProps = (async (context) => {
  const movexInstanceUrl = JSON.parse(
    getCookieFromRequest(context, 'movex-instances') || '{}'
  ).active;

  return {
    props: {
      store: await fetchAllStore(movexInstanceUrl),
    },
  };
}) satisfies GetServerSideProps<any>;

export default function Page({
  store,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Resources" />
      <ResourcesView store={store} />
    </DefaultLayout>
  );
}
