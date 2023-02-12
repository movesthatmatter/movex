import {
  Action,
  ActionsCollectionMapBase,
  GenericAction,
  GenericClientResource,
  ResourceReducerMap,
  StringKeys,
} from '@matterio/core-util';

export const createResourceReducerMap = <
  TResource extends GenericClientResource,
  ActionsCollectionMap extends ActionsCollectionMapBase,
  TReducerMap extends ResourceReducerMap<
    TResource,
    ActionsCollectionMap
  > = ResourceReducerMap<TResource, ActionsCollectionMap>
>(
  reducerMap: TReducerMap
) => reducerMap;

// Here - it needs to handle the private action one as well
// NEXT - Implement this on the backend and check public/private
// Next Next - implement in on maha and change the whole game strategy to this
export const dispatchFactory = <
  TResource extends GenericClientResource,
  ActionsCollectionMap extends ActionsCollectionMapBase,
  TReducerMap extends ResourceReducerMap<
    TResource,
    ActionsCollectionMap
  > = ResourceReducerMap<TResource, ActionsCollectionMap>
>(
  initialResource: Promise<TResource> | TResource,
  reducerMap: TReducerMap,
  onUpdate?: (state: TResource['item']) => void
) => {
  // the actions that were batched before the initial state had a chance to resolve
  let prebatchedActions: GenericAction[] = [];

  // let { item: prevState } = await initialResource;
  let prevState: TResource['item'];

  let initiated = false;

  Promise.resolve(initialResource).then((r) => {
    prevState = r.item;

    initiated = true;

    // If there are any prebatched actions simply call dispatch with all of them
    if (prebatchedActions.length > 0) {
      prebatchedActions.forEach((action) => {
        dispatch(action.type as any, action.payload as any);
      });

      prebatchedActions = [];
    }
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
    return reducer(prevState, action);
  };

  const dispatch = <TActionType extends StringKeys<ActionsCollectionMap>>(
    type: TActionType,
    payload: ActionsCollectionMap[TActionType]
  ) => {
    if (!initiated) {
      prebatchedActions.push({
        type,
        payload,
      });

      return;
    }

    const nextState = getNextState(prevState, { type, payload });

    // This checks at instance level (really fast)
    if (prevState !== nextState) {
      onUpdate?.(nextState);

      prevState = nextState;
    }
  };

  return dispatch;
};
