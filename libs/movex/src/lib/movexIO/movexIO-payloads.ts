import { AnyResourceIdentifier } from 'movex-core-util';
import {
  AnyAction,
  AnyActionOrActionTuple,
  AnyCheckedAction,
  CheckedReconciliatoryActions,
} from '../tools/action';

export type EmitActionMsg = {
  kind: 'emitAction';
  payload: {
    rid: AnyResourceIdentifier;
    action: AnyActionOrActionTuple;
  };
};

export type FwdActionMsg = {
  kind: 'fwdAction';
  payload: {
    rid: AnyResourceIdentifier;
    action: AnyCheckedAction;
  };
};

export type ReconciliatoryActionsMsg = {
  kind: 'reconciliatoryActions';
  payload: {
    rid: AnyResourceIdentifier;
    actions: CheckedReconciliatoryActions<AnyAction>;
  };
};
