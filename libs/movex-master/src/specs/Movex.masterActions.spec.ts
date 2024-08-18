import { computeCheckedState } from 'movex-core-util';
import { counterReducer, tillNextTick } from 'movex-specs-util';
import { movexClientMasterOrchestrator } from 'movex-master';
import MockDate from 'mockdate';

const orchestrator = movexClientMasterOrchestrator();

beforeEach(async () => {
  await orchestrator.unsubscribe();
});

test('Dispatch Public MasterAction', async () => {
  const {
    clients: [counterResource],
    $util,
  } = orchestrator.orchestrate({
    clientIds: ['test-user'],
    reducer: counterReducer,
    resourceType: 'counter',
  });

  const { rid } = await counterResource.create({ count: 0 }).resolveUnwrap();

  const r = counterResource.bind(rid);

  // Pause the emits to master so I can check the intermediary state on local
  $util.pauseEmit();

  const MOCKED_NOW = 33;
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

  // Mock the different time on the server
  MockDate.set(new Date(MOCKED_NOW + 2));
  // Resume the master emits
  $util.resumeEmit();

  await tillNextTick();

  const actual = r.getCheckedState();
  const expected = computeCheckedState({ count: MOCKED_NOW + 2 });

  expect(actual).toEqual(expected);
});
