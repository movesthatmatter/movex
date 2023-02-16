import { AsyncResult, AsyncResultWrapper } from 'ts-async-results';
import { Ok } from 'ts-results';
import {
  GenericClientResource,
  GenericResource,
  StringKeys,
  UnknownRecord,
} from '../core-types';
import {
  Action,
  ActionOrActionTuple,
  ActionsCollectionMapBase,
  AnyActionOf,
  AnyPublicActionOf,
  DispatchFn,
  GenericPrivateAction,
  GenericPublicAction,
  PrivateAction,
  PublicAction,
  ResourceAndChecksum,
  ResourceReducerMap,
  StateAndChecksum,
} from './types';
import { invoke, noop } from '../core-util';
import { hashObject, isAction } from './util';
import { Observable } from '../core-util/Observable';

export const createResourceReducerMap =
  <
    TResource extends GenericClientResource,
    ActionsCollectionMap extends ActionsCollectionMapBase
  >() =>
  <TReducerMap extends ResourceReducerMap<TResource, ActionsCollectionMap>>(
    reducerMap: TReducerMap
  ) =>
    reducerMap;

// Here - it needs to handle the private action one as well
// NEXT - Implement this on the backend and check public/private
// Next Next - implement in on maha and change the whole game strategy to this
export const createDispatcher = <
  TResource extends GenericClientResource,
  ActionsCollectionMap extends ActionsCollectionMapBase,
  TReducerMap extends ResourceReducerMap<
    TResource,
    ActionsCollectionMap
  > = ResourceReducerMap<TResource, ActionsCollectionMap>
>(
  // initialResource: Promise<TResource> | TResource,
  $resource: Observable<ResourceAndChecksum<TResource>>,
  reducerMap: TReducerMap,
  {
    onDispatched = noop,
    onStateUpdated = noop,
  }: {
    // This will be called any time an action got dispatched
    // Even if the state didn't update!
    // This is in order to have more control at the client's end. where they can easily check the checksum's or even instance
    //  if there was any update
    onDispatched?: (
      next: {
        state: TResource['item'];
        checksum: string;
      },
      prev: {
        state: TResource['item'];
        checksum: string;
      },
      action: AnyActionOf<ActionsCollectionMap>,
      pairedAction?: AnyPublicActionOf<ActionsCollectionMap>
    ) => void;
    onStateUpdated?: (
      next: {
        state: TResource['item'];
        checksum: string;
      },
      prev: {
        state: TResource['item'];
        checksum: string;
      },
      action: AnyActionOf<ActionsCollectionMap>,
      pairedAction?: AnyPublicActionOf<ActionsCollectionMap>
    ) => void;
  }
) => {
  // the actions that were batched before the initial state had a chance to resolve
  let prebatchedActions: (
    | GenericPublicAction
    | GenericPrivateAction
    | [GenericPrivateAction, GenericPublicAction]
  )[] = [];

  // let { item: prevState } = await initialResource;
  // let prevState: TResource['item'];
  // let prevChecksum: string;

  let currentStateAndChecksum: StateAndChecksum<TResource['item']>;

  let initiated = false;

  Promise.resolve($resource.state).then((r) => {
    currentStateAndChecksum = {
      state: r.resource.item,
      checksum: r.checksum,
    };

    initiated = true;

    // If there are any prebatched actions simply call dispatch with all of them
    if (prebatchedActions.length > 0) {
      prebatchedActions.forEach((actionOrActions) => {
        dispatch(actionOrActions as any); // FIX this type
        // if (Array.isArray(actionOrActions)) {
        // } else {
        //   dispatch(actionOrActions as any); // FIX this type
        // }
      });

      prebatchedActions = [];
    }

    return r;
  });

  $resource.onUpdate((r) => {
    currentStateAndChecksum = {
      state: r.resource.item,
      checksum: r.checksum,
    };

    initiated = true;
  });

  const getNextState = <TActionType extends StringKeys<ActionsCollectionMap>>(
    prev: TResource['item'],
    action: Action<TActionType, ActionsCollectionMap[TActionType]>
  ) => {
    const reducer = reducerMap[action.type];

    if (!reducer) {
      return prev;
    }

    // this is actually the next state
    return reducer(currentStateAndChecksum.state, action);
  };

  // function dispatch<TActionType extends StringKeys<ActionsCollectionMap>>(
  //   publicAction: Action<TActionType, ActionsCollectionMap[TActionType]>
  // ): void;
  // function dispatch<TActionType extends StringKeys<ActionsCollectionMap>>(
  //   privateAction: PrivateAction<
  //     TActionType,
  //     ActionsCollectionMap[TActionType]
  //   >,
  //   publicAction?: PublicAction<TActionType, ActionsCollectionMap[TActionType]>
  // ): void;
  const dispatch = <TActionType extends StringKeys<ActionsCollectionMap>>(
    actionOrActionTuple: ActionOrActionTuple<TActionType, ActionsCollectionMap>
  ) => {
    const [localAction, remoteAction] = invoke(() => {
      if (isAction(actionOrActionTuple)) {
        return [actionOrActionTuple];
      }

      return actionOrActionTuple;
    });

    if (!initiated) {
      prebatchedActions.push(actionOrActionTuple);

      return;
    }

    // const action = { type, payload } as const;

    const nextState = getNextState(currentStateAndChecksum.state, localAction);
    const nextChecksum = hashObject(nextState);

    onDispatched(
      {
        state: nextState,
        checksum: nextChecksum,
      },
      currentStateAndChecksum,
      localAction,
      remoteAction
    );

    // TODO: This could check at instance level as well in addition to the checksums to speed up (but very minimal I believe)
    if (currentStateAndChecksum.checksum !== nextChecksum) {
      onStateUpdated(
        {
          state: nextState,
          checksum: nextChecksum,
        },
        currentStateAndChecksum,
        localAction,
        remoteAction
      );

      // Only if different update them
      currentStateAndChecksum = {
        state: nextState,
        checksum: nextChecksum,
      };
    }
  };

  // const dispathAndWait = <TActionType extends StringKeys<ActionsCollectionMap>>(type: TActionType, payload: ActionsCollectionMap[TActionType]) => new Promise((resolve: (nextState: TResource['item']) => void) => {
  //   dispatch(type, payload, resolve)
  // });
  // dispatch([{ type: 'asd', payload: '', isPrivate: false}, {type: 'as', payload: ''}])

  return dispatch;
};

export const getMasterDispatchOnUpdate = <
  ActionsCollectionMap extends ActionsCollectionMapBase,
  TResource extends GenericResource = GenericResource,
  TReducerMap extends ResourceReducerMap<
    TResource,
    ActionsCollectionMap
  > = ResourceReducerMap<TResource, ActionsCollectionMap>
>(
  resource: TResource,
  reducerMap: TReducerMap,
  updateResource: (nextState: TResource['item']) => void
) => {
  return async (
    nextState: TResource['item'],
    nextChecksum: string,
    action: AnyActionOf<ActionsCollectionMap>
  ) => {
    // check if action

    // update master resource in place here
    // masterResource = {
    //   ...masterResource,
    //   item: nextState,
    // };
    updateResource(nextState);

    if (action.isPrivate) {
      // This gets called by the backend after each private action
      if (
        reducerMap.$canReconcile?.(nextState, {
          type: '$canReconcile',
          payload: undefined,
        })
      ) {
        // Reconcile the actions
      }
      // TODO: call reconciliator
      // masterDispatch({
      //   type: '$canReconcile',
      //   payload: undefined,
      // })
    }
  };
};

// export const masterDispatchFactory = <
// TResource extends GenericClientResource,
// ActionsCollectionMap extends ActionsCollectionMapBase,
// TReducerMap extends ResourceReducerMap<
//   TResource,
//   ActionsCollectionMap
// > = ResourceReducerMap<TResource, ActionsCollectionMap>
// >(
// initialResource: Promise<TResource> | TResource,
// reducerMap: TReducerMap,
// onUpdate?: (state: TResource['item']) => void
// ) => {

// }

// @deprecate
// This is functional programming
export const applyReducerAction = <
  ActionsCollectionMap extends ActionsCollectionMapBase,
  TResource extends GenericResource = GenericResource,
  TReducerMap extends ResourceReducerMap<
    TResource,
    ActionsCollectionMap
  > = ResourceReducerMap<TResource, ActionsCollectionMap>
>(
  $resource: Observable<ResourceAndChecksum<TResource>>,
  reducerMap: TReducerMap
) => {
  return <TActionType extends StringKeys<ActionsCollectionMap>>(
    action: Action<TActionType, ActionsCollectionMap[TActionType]>
  ) => {
    return new AsyncResultWrapper<[TResource['item'], string], unknown>(
      new Promise((resolve) => {
        // Create the dispatcher
        // TODO: This could be refactored to use only the portion that generates the next state
        const dispatch = createDispatcher<TResource, ActionsCollectionMap>(
          $resource,
          reducerMap,
          {
            onDispatched: (next, prev) => {
              resolve(new Ok([next.state, next.checksum]));
            },
          }
        );
        // Dispatch the action
        dispatch(action);
      })
    );
  };
};

// export const createMasterReducerApplicator =
//   <
//     ActionsCollectionMap extends ActionsCollectionMapBase,
//     TResource extends GenericResource = GenericResource,
//     TReducerMap extends ResourceReducerMap<
//       TResource,
//       ActionsCollectionMap
//     > = ResourceReducerMap<TResource, ActionsCollectionMap>
//   >(
//     resource: TResource,
//     reducerMap: TReducerMap
//   ) =>
//   (
//     privateOrPublicAction: AnyActionOf<ActionsCollectionMap>,
//     publicAction?: AnyPublicActionOf<ActionsCollectionMap>
//   ) => {
//     const privateOrPunlicActionAsyncResult = applyReducerAction<
//       ActionsCollectionMap,
//       TResource
//     >(
//       resource,
//       reducerMap
//     )(privateOrPublicAction);

//     // This is only present if the local action was private
//     if (publicAction) {
//       const publicActionAsyncResult = applyReducerAction<
//         ActionsCollectionMap,
//         TResource
//       >(
//         resource,
//         reducerMap
//       )(publicAction);

//       return AsyncResult.all(
//         privateOrPunlicActionAsyncResult,
//         publicActionAsyncResult
//       );
//     }

//     return AsyncResult.all(privateOrPunlicActionAsyncResult);
//   };
