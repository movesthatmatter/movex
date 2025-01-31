import type { GetStaticProps, InferGetServerSidePropsType } from 'next';
import DefaultLayout from 'apps/movex-admin/components/Layouts/DefaultLayout';
import { fetchConnections } from 'apps/movex-admin/api/storeApi';
import Breadcrumb from 'apps/movex-admin/components/Breadcrumbs/Breadcrumb';
import { ConnectionsView } from 'apps/movex-admin/modules/Connections/ConnectionsView';
import { getCookieFromRequest } from 'apps/movex-admin/lib/misc';

export const getServerSideProps = (async (context) => {
  const movexInstanceUrl = JSON.parse(
    getCookieFromRequest(context, 'movex-instances') || '{}'
  ).active;

  return {
    props: {
      connections: await fetchConnections(movexInstanceUrl),
    },
  };
}) satisfies GetStaticProps<any>;

export default function Page({
  connections,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Connections" />
      <ConnectionsView connections={connections} />
    </DefaultLayout>
  );
}
