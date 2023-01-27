import { UnknownRecord } from '@matterio/core-util';

export type ClientResource<
  TResourceType extends string,
  TData extends UnknownRecord
> = {
  type: TResourceType;
  item: {
    id: string;
  } & TData;
};
