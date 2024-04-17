import type { AnyAction } from '../action';
import {
  MovexClientInfo,
  SanitizedMovexClient,
  UnknownRecord,
} from '../core-types';
import { EventEmitter } from '../EventEmitter';
import { BaseConnection } from './BaseConnection';
import { IOEvents } from './IOEvents';

export class ConnectionToMaster<
  TState,
  TAction extends AnyAction,
  TResourceType extends string,
  TClientInfo extends MovexClientInfo
> extends BaseConnection<TState, TAction, TResourceType, TClientInfo> {
  //   constructor(
  //     clientId: SanitizedMovexClient['id'],
  //     emitter: EventEmitter<IOEvents<TState, TAction, TResourceType>>,
  //     public clientInfo: TClientInfo
  //   ) {
  //     super(clientId, emitter);
  //   }
}
