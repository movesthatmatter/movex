export type MovexStoreData = {
  connections: {
    count: number;
  };
  resources: Record<
    string,
    {
      totalCount: number;
      activeCount: number;
      resource: string;
      subscribersCount: number;
      // isActive: boolean;
    }
  >;
};
