import Breadcrumb from 'apps/movex-admin/components/Breadcrumbs/Breadcrumb';
import {
  objectKeys,
  UnknownMovexDefinitionResourcesMap,
} from 'movex-core-util';
import { MovexStoreItemsMapByType } from 'movex-store';
import { ResourceTypesList } from './components/StoreItemTypesList';

type Props = {
  store: MovexStoreItemsMapByType<UnknownMovexDefinitionResourcesMap>;
};

export const ResourcesView = ({ store }: Props) => {
  return (
    <ResourceTypesList
      items={objectKeys(store).map((itemType) => ({
        name: `${itemType} (${objectKeys(store[itemType] || {}).length})`,
        hrefPath: itemType,
      }))}
      hrefBase="/resources"
    />
  );
};
