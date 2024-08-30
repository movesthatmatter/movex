import {
  computeCheckedState,
  GetReducerAction,
  GetReducerState,
  IOEvents,
} from 'movex-core-util';
import { counterReducer, tillNextTick } from 'movex-specs-util';
import {
  createMasterContext,
  movexClientMasterOrchestrator,
} from 'movex-master';
import MockDate from 'mockdate';
import { Ok } from 'ts-results';

const orchestrator = movexClientMasterOrchestrator();

beforeEach(async () => {
  await orchestrator.unsubscribe();
});

describe('Dispatching a Public Master Action with a Single Client', () => {
  test('Pending Local State and Master Ack Response', async () => {
    const {
      clients: [counterResource],
      $util,
    } = orchestrator.orchestrate({
      clientIds: ['test-user'],
      reducer: counterReducer,
      resourceType: 'counter',
    });

    const [clientEmitter] = $util.clientEmitters;

    const { rid } = await counterResource.create({ count: 0 }).resolveUnwrap();

    const r = counterResource.bind(rid);

    const emitActionDispatchSpy = jest.fn();
    clientEmitter._onEmitAck((s) => {
      // Ensure the master ack response is correct as well
      if (s.event === 'emitActionDispatch') {
        emitActionDispatchSpy(s.payload);
      }
    });

    // Pause the emits to master so I can check the intermediary state on local
    $util.pauseEmit();

    let MOCKED_NOW = 33;
    MockDate.set(new Date(MOCKED_NOW));

    r.dispatch((movex) => ({
      type: 'incrementBy',
      payload: movex.$queries.now(),
    }));

    await tillNextTick();

    // Local updates only

    const actualLocal = r.getCheckedState();
    const expectedLocal = computeCheckedState({ count: MOCKED_NOW });

    expect(actualLocal).toEqual(expectedLocal);

    // Master updates (client-master sync)

    MOCKED_NOW += 2;
    // Mock the different time on the server
    MockDate.set(new Date(MOCKED_NOW));
    // Resume the master emits
    $util.resumeEmit();

    await tillNextTick();

    const actual = r.getCheckedState();
    const expected = computeCheckedState({ count: MOCKED_NOW });

    const expectedMockState = createMasterContext({ requestAt: MOCKED_NOW });

    expect(actual).toEqual(expected);

    const expectedAckResponse: ReturnType<
      IOEvents<
        GetReducerState<typeof counterReducer>,
        GetReducerAction<typeof counterReducer>,
        string
      >['emitActionDispatch']
    > = new Ok({
      type: 'masterActionAck',
      nextCheckedAction: {
        action: {
          payload: MOCKED_NOW,
          type: 'incrementBy',
        },
        checksum: expected[1],
      },
      masterContext: expectedMockState,
    } as const);

    expect(emitActionDispatchSpy).toHaveBeenCalledWith(expectedAckResponse);
  });
});

describe('Dispatching a Public Master Action with a Multiple Clients', () => {
  test('Pending Local State, Master Ack Response and Fwd Actions', async () => {
    const {
      clients: [aUserResource, bUserResource],
      $util,
    } = orchestrator.orchestrate({
      clientIds: ['user-a', 'user-b'],
      reducer: counterReducer,
      resourceType: 'counter',
    });

    const [_, bClientEmitter] = $util.clientEmitters;

    const { rid } = await aUserResource.create({ count: 0 }).resolveUnwrap();

    const aClientMovex = aUserResource.bind(rid);
    bUserResource.bind(rid);

    // Pause the emits to master so I can check the intermediary state on local

    let MOCKED_NOW = 33;
    MockDate.set(new Date(MOCKED_NOW));

    const peerOnFwdActionSpy = jest.fn();
    bClientEmitter.subscribe('onFwdAction', (payload) => {
      peerOnFwdActionSpy(payload);
    });

    $util.pauseEmit();

    aClientMovex.dispatch((movex) => ({
      type: 'incrementBy',
      payload: movex.$queries.now(),
    }));

    await tillNextTick();

    // Local updates only

    const actualLocal = aClientMovex.getCheckedState();
    const expectedLocal = computeCheckedState({ count: MOCKED_NOW });

    expect(actualLocal).toEqual(expectedLocal);

    // Master updates (client-master sync)

    // Mock the different time on the server
    const MASTER_MOCKED_NOW = MOCKED_NOW + 2;

    MockDate.set(new Date(MASTER_MOCKED_NOW));
    // Resume the master emits
    $util.resumeEmit();

    await tillNextTick();

    const actual = aClientMovex.getCheckedState();
    const expected = computeCheckedState({ count: MASTER_MOCKED_NOW });

    const expectedMasterContext = createMasterContext({ requestAt: MASTER_MOCKED_NOW })

    expect(actual).toEqual(expected);

    const expectedPeerFwdActionPayload: Parameters<
      IOEvents<
        GetReducerState<typeof counterReducer>,
        GetReducerAction<typeof counterReducer>,
        string
      >['onFwdAction']
    >[0] = {
      rid,
      action: {
        type: 'incrementBy',
        payload: MASTER_MOCKED_NOW,
      },
      checksum: expected[1],
      masterContext: expectedMasterContext,
    };

    expect(peerOnFwdActionSpy).toHaveBeenCalledWith(
      expectedPeerFwdActionPayload
    );
  });
});
