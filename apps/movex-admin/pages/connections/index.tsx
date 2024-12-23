import type { InferGetStaticPropsType, GetStaticProps } from 'next';
import DefaultLayout from 'apps/movex-admin/components/Layouts/DefaultLayout';
import { fetchConnections } from 'apps/movex-admin/api/storeApi';
import Breadcrumb from 'apps/movex-admin/components/Breadcrumbs/Breadcrumb';
import { ConnectionsView } from 'apps/movex-admin/modules/Connections/ConnectionsView';

export const getStaticProps = (async (context) => {
  return {
    props: {
      connections: await fetchConnections(),
    },
  };
}) satisfies GetStaticProps<any>;

export default function Page({
  connections,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Connections" />
      <ConnectionsView connections={connections} />
    </DefaultLayout>
  );
}
