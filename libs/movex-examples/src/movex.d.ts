import { MovexResourceTypesFromMovexDefinition } from 'movex';
import movexConfig from './movex.config';

export type DemoMovexResourcesTypes = MovexResourceTypesFromMovexDefinition<
  typeof movexConfig
>;

export type DemoMovexDefinition = typeof movexConfig;