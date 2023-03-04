import { MovexMaster } from '../lib/MovexMaster';
import counterReducer, { initialCounterState } from './util/counterReducer';
import { LocalMovexStore } from '../lib/store';
import {
  AnyResourceIdentifier,
  ResourceIdentifier,
  toResourceIdentifierStr,
} from 'movex-core-util';
import { computeCheckedState } from '../lib/util';

const rid = toResourceIdentifierStr({ resourceType: 'c', resourceId: '1' });

test('gets initial state', async () => {
  const master = new MovexMaster(
    counterReducer,
    new LocalMovexStore({
      [rid]: initialCounterState,
    })
  );

  const actualPublic = await master.getPublic(rid).resolveUnwrap();
  const actualByClient = await master.get(rid, 'testClient').resolveUnwrap();

  const expectedPublic = computeCheckedState(initialCounterState);

  expect(actualPublic).toEqual(expectedPublic);
  expect(actualByClient).toEqual(expectedPublic);
});

test('applies public action', async () => {
  const master = new MovexMaster(
    counterReducer,
    new LocalMovexStore({
      [rid]: initialCounterState,
    })
  );

  const clientAId = 'clienA';

  await master
    .applyAction(rid, clientAId, {
      type: 'increment',
    })
    .resolveUnwrap();

  const actualPublic = await master.getPublic(rid).resolveUnwrap();
  const actualByClient = await master.get(rid, clientAId).resolveUnwrap();

  const expectedPublic = computeCheckedState({
    ...initialCounterState,
    count: 1,
  });

  expect(actualPublic).toEqual(expectedPublic);
  expect(actualByClient).toEqual(expectedPublic);
});

test('applies private action', async () => {
  const master = new MovexMaster(
    counterReducer,
    new LocalMovexStore({
      [rid]: initialCounterState,
    })
  );

  const senderClientId = 'senderClient';

  await master
    .applyAction(rid, senderClientId, [
      {
        type: 'change',
        payload: 44,
        isPrivate: true,
      },
      {
        type: 'increment',
      },
    ])
    .resolveUnwrap();

  const actualPublic = await master.getPublic(rid).resolveUnwrap();
  const actualBySenderClient = await master
    .get(rid, senderClientId)
    .resolveUnwrap();
  const actualByOtherClient = await master
    .get(rid, 'otherClient')
    .resolveUnwrap();

  const expectedPublic = computeCheckedState({
    ...initialCounterState,
    count: 1,
  });

  expect(actualPublic).toEqual(expectedPublic);

  const expctedSenderState = computeCheckedState({
    ...initialCounterState,
    count: 44,
  });

  expect(actualByOtherClient).toEqual(expectedPublic);

  expect(actualBySenderClient).toEqual(expctedSenderState);
});
