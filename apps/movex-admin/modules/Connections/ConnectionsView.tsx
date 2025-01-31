import { MovexClientsRecord, objectKeys } from 'movex-core-util';
import { ClientItem } from './components/ClientItem';

type Props = {
  connections: MovexClientsRecord;
};

export const ConnectionsView = ({ connections }: Props) => {
  return (
    <div>
      Count: {Object.keys(connections).length}
      {objectKeys(connections).map((clientId) => (
        <ClientItem key={clientId} client={connections[clientId]} />
      ))}
    </div>
  );
};
