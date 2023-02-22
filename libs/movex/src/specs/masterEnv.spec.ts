import { computeCheckedState, createMovexReducerMap } from '../lib/util';
import { createMasterEnv } from './util/createMasterEnv';
require('console-group').install();

type ActionsMap = {
  changeCount: number;
};

type State = {
  count: number;
};

const initialState: State = {
  count: 0,
};

const reducer = createMovexReducerMap<ActionsMap, State>(initialState)({
  changeCount: (prev, { payload }) => ({
    ...prev,
    count: payload,
  }),
});

test('gets an ack checksum after action emited', async () => {
  const masterEnv = createMasterEnv<State, ActionsMap>({
    genesisState: initialState,
    reducerMap: reducer,
    clientCountorIds: ['a', 'b', 'c'],
  });

  const [a, b, c] = masterEnv.clients;

  const initialCheckedState = masterEnv.getPublic();
  expect(initialCheckedState).toEqual(computeCheckedState(initialState));

  const actualChecksum = await a.emitAction({
    type: 'changeCount',
    payload: 2,
  });

  expect(actualChecksum).toBeDefined();
  expect(actualChecksum).not.toEqual(initialCheckedState[1]);
});

test('the peers get the action forwarded', async () => {
  const masterEnv = createMasterEnv<State, ActionsMap>({
    genesisState: initialState,
    reducerMap: reducer,
    clientCountorIds: ['a', 'b', 'c'],
  });

  const [a, b, c] = masterEnv.clients;

  const aSpy = jest.fn();
  const bSpy = jest.fn();
  const cSpy = jest.fn();

  a.onFwdAction(aSpy);
  b.onFwdAction(bSpy);
  c.onFwdAction(cSpy);

  const actualChecksum = await a.emitAction({
    type: 'changeCount',
    payload: 2,
  });

  expect(bSpy).toHaveBeenCalledWith({
    action: {
      type: 'changeCount',
      payload: 2,
    },
    checksum: actualChecksum,
  });

  expect(cSpy).toHaveBeenCalledWith({
    action: {
      type: 'changeCount',
      payload: 2,
    },
    checksum: actualChecksum,
  });

  expect(aSpy).not.toHaveBeenCalled();
});

test('the peers get the state updated', async () => {
  const masterEnv = createMasterEnv<State, ActionsMap>({
    genesisState: initialState,
    reducerMap: reducer,
    clientCountorIds: ['a', 'b', 'c'],
  });

  const [a, b, c] = masterEnv.clients;

  const aSpy = jest.fn();
  const bSpy = jest.fn();
  const cSpy = jest.fn();

  a.subscribeToNetworkExpensiveMasterUpdates(aSpy);
  b.subscribeToNetworkExpensiveMasterUpdates(bSpy);
  c.subscribeToNetworkExpensiveMasterUpdates(cSpy);

  const actualChecksum = await a.emitAction({
    type: 'changeCount',
    payload: 2,
  });

  const expectedState: State = {
    ...initialState,
    count: 2,
  };

  const expected = computeCheckedState(expectedState);

  expect(actualChecksum).toBe(expected[1]);

  expect(bSpy).toHaveBeenCalledWith(expected);
  expect(cSpy).toHaveBeenCalledWith(expected);
  expect(aSpy).not.toHaveBeenCalled();
});
