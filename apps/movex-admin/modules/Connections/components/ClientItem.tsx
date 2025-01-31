import { MovexClient, objectKeys } from 'movex-core-util';

type Props = {
  client: MovexClient;
};

export const ClientItem = ({ client }: Props) => {
  const subscriptionsList = objectKeys(client.subscriptions).map((id) => ({
    id,
    ...client.subscriptions[id],
  }));

  return (
    <div className="bg-slate-200 p-3 mb-3">
      <span className="font-bolds">
        <span className="font-bold">Client Id:</span> {client.id}
      </span>
      <div>
        <span className="font-bold">Info:</span>
        <pre>{JSON.stringify(client.info, null, 2)}</pre>
      </div>
      <div>{subscriptionsList.map((val) => val.subscribedAt)}</div>
    </div>
  );
};
