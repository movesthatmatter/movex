import { globalLogsy, computeCheckedState } from  'movex-core-util';
import {
  tillNextTick,
  chatReducer,
  initialChatState,
} from 'movex-specs-util';
import { movexClientMasterOrchestrator } from 'movex-master';

const orchestrator = movexClientMasterOrchestrator();

// console.log('movexClientMasterOrchestrator', movexClientMasterOrchestrator);
// console.log('orchestrator', orchestrator);

beforeAll(() => {
  globalLogsy.disable();
});

afterAll(() => {
  globalLogsy.enable();
});

beforeEach(async () => {
  await orchestrator.unsubscribe();
});

test('Adds Single Participant', async () => {
  const participantId = 'blue-client';

  const {
    clients: [chatClientResource],
  } = orchestrator.orchestrate({
    clientIds: [participantId],
    reducer: chatReducer,
    resourceType: 'chat',
  });

  const { rid } = await chatClientResource
    .create(initialChatState)
    .resolveUnwrap();

  const blueMovex = chatClientResource.bind(rid);

  blueMovex.dispatch({
    type: 'addParticipant',
    payload: {
      id: participantId,
      color: 'blue',
      atTimestamp: 123,
    },
  });

  await tillNextTick();

  const actual = blueMovex.state.checkedState;

  const expected = computeCheckedState({
    ...initialChatState,
    participants: {
      [participantId]: {
        active: true,
        color: 'blue',
        id: participantId,
        joinedAt: 123,
        leftAt: undefined,
      },
    },
  });

  expect(actual).toEqual(expected);
});

test('Single Participant Writes a Message', async () => {
  const participantId = 'blue-client';

  const {
    clients: [chatClientResource],
  } = orchestrator.orchestrate({
    clientIds: [participantId],
    reducer: chatReducer,
    resourceType: 'chat',
  });

  const { rid } = await chatClientResource
    .create(initialChatState)
    .resolveUnwrap();

  const blueMovex = chatClientResource.bind(rid);

  blueMovex.dispatch({
    type: 'addParticipant',
    payload: {
      id: participantId,
      color: 'blue',
      atTimestamp: 120,
    },
  });

  await tillNextTick();

  blueMovex.dispatch({
    type: 'writeMessage',
    payload: {
      msg: 'Hey',
      participantId,
      atTimestamp: 130,
      id: '1',
    },
  });

  await tillNextTick();

  const actual = blueMovex.state.checkedState;

  const expected = computeCheckedState({
    ...initialChatState,
    participants: {
      [participantId]: {
        active: true,
        color: 'blue',
        id: participantId,
        joinedAt: 120, // Not relevant
        leftAt: undefined,
      },
    },
    messages: [
      {
        at: 130, // Not relevant
        id: '1', // Not relevant
        content: 'Hey',
        participantId,
      },
    ],
  });

  expect(actual).toEqual(expected);
});

test('Adding Multiple Participants', async () => {
  const blueClient = 'blue-client';
  const orangeClient = 'orange-client';
  const yellowClient = 'yellow-client';

  const {
    clients: [blueClientResource, orangeClientResource, yellowClientResource],
  } = orchestrator.orchestrate({
    clientIds: [blueClient, orangeClient, yellowClient],
    reducer: chatReducer,
    resourceType: 'chat',
  });

  const { rid } = await blueClientResource
    .create(initialChatState)
    .resolveUnwrap();

  const blueMovex = blueClientResource.bind(rid);
  const yellowMovex = yellowClientResource.bind(rid);
  const orangeMovex = orangeClientResource.bind(rid);

  blueMovex.dispatch({
    type: 'addParticipant',
    payload: {
      id: blueClient,
      color: 'blue',
      atTimestamp: 122,
    },
  });

  await tillNextTick();

  orangeMovex.dispatch({
    type: 'addParticipant',
    payload: {
      id: orangeClient,
      color: 'orange',
      atTimestamp: 123,
    },
  });

  await tillNextTick();

  yellowMovex.dispatch({
    type: 'addParticipant',
    payload: {
      id: yellowClient,
      color: 'yellow',
      atTimestamp: 124,
    },
  });

  await tillNextTick();

  const actual = blueMovex.state.checkedState;

  const expected = computeCheckedState({
    ...initialChatState,
    participants: {
      [blueClient]: {
        active: true,
        color: 'blue',
        id: blueClient,
        joinedAt: 122,
        leftAt: undefined,
      },
      [orangeClient]: {
        active: true,
        color: 'orange',
        id: orangeClient,
        joinedAt: 123,
        leftAt: undefined,
      },
      [yellowClient]: {
        active: true,
        color: 'yellow',
        id: yellowClient,
        joinedAt: 124,
        leftAt: undefined,
      },
    },
    messages: [],
  });

  expect(actual).toEqual(expected);
});

test('Multiple Participants Write Multiple Messages', async () => {
  const blueClient = 'blue-client';
  const orangeClient = 'orange-client';
  const yellowClient = 'yellow-client';

  const {
    clients: [blueClientResource, orangeClientResource, yellowClientResource],
  } = orchestrator.orchestrate({
    clientIds: [blueClient, orangeClient, yellowClient],
    reducer: chatReducer,
    resourceType: 'chat',
  });

  const { rid } = await blueClientResource
    .create(initialChatState)
    .resolveUnwrap();

  const blueMovex = blueClientResource.bind(rid);
  const yellowMovex = orangeClientResource.bind(rid);
  const orangeMovex = yellowClientResource.bind(rid);

  blueMovex.dispatch({
    type: 'addParticipant',
    payload: {
      id: blueClient,
      color: 'blue',
      atTimestamp: 123,
    },
  });

  await tillNextTick();

  orangeMovex.dispatch({
    type: 'addParticipant',
    payload: {
      id: orangeClient,
      color: 'orange',
      atTimestamp: 124,
    },
  });

  await tillNextTick();

  yellowMovex.dispatch({
    type: 'addParticipant',
    payload: {
      id: yellowClient,
      color: 'yellow',
      atTimestamp: 125,
    },
  });

  await tillNextTick();

  yellowMovex.dispatch({
    type: 'writeMessage',
    payload: {
      msg: 'Hey Everybody',
      participantId: yellowClient,
      atTimestamp: 223,
      id: '1',
    },
  });

  await tillNextTick();

  orangeMovex.dispatch({
    type: 'writeMessage',
    payload: {
      msg: 'Hey Blue! How are you?',
      participantId: orangeClient,
      atTimestamp: 224,
      id: '2',
    },
  });

  await tillNextTick();

  const actual = blueMovex.state.checkedState;

  const expected = computeCheckedState({
    ...initialChatState,
    participants: {
      [blueClient]: {
        active: true,
        color: 'blue',
        id: blueClient,
        joinedAt: 123, // Not relevant
        leftAt: undefined,
      },
      [orangeClient]: {
        active: true,
        color: 'orange',
        id: orangeClient,
        joinedAt: 124, // Not relevant
        leftAt: undefined,
      },
      [yellowClient]: {
        active: true,
        color: 'yellow',
        id: yellowClient,
        joinedAt: 125, // Not relevant
        leftAt: undefined,
      },
    },
    messages: [
      {
        content: 'Hey Everybody',
        participantId: yellowClient,
        at: 223,
        id: '1',
      },
      {
        content: 'Hey Blue! How are you?',
        participantId: orangeClient,
        at: 224,
        id: '2',
      },
    ],
  });

  expect(actual).toEqual(expected);
});
