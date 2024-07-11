import { Observable } from './Observable';

test('Get', () => {
  const $model = new Observable(1);

  expect($model.get()).toEqual(1);
});

test('Update', () => {
  const $model = new Observable(1);

  $model.update(2);

  expect($model.get()).toEqual(2);
});

test('On Update', () => {
  const $model = new Observable(1);

  const spy = jest.fn();

  $model.onUpdate(spy);

  $model.update(2);

  expect(spy).toHaveBeenCalledWith(2);
});

describe('Map', () => {
  test('Update on $root triggers an update on the $mapped', () => {
    const $root = new Observable(1);
    const $mappedModel = $root.map((x) => x + 10);

    const spy = jest.fn();
    $mappedModel.onUpdate(spy);

    $root.update(2);

    expect($root.get()).toEqual(2);

    expect(spy).toHaveBeenCalledWith(12);
    expect($mappedModel.get()).toEqual(12);
  });

  test('Update on $mapped does NOT trigger an update on the $root', () => {
    const $root = new Observable(0);
    const $mappedModel = $root.map((x) => x + 10);

    const spyOnMapped = jest.fn();
    $mappedModel.onUpdate(spyOnMapped);

    const spyOnRoot = jest.fn();
    $root.onUpdate(spyOnRoot);

    $mappedModel.update(2);

    expect($mappedModel.get()).toEqual(2);
    expect(spyOnMapped).toHaveBeenCalledWith(2);

    expect($root.get()).toEqual(0); // the initial val
    expect(spyOnRoot).not.toHaveBeenCalled();
  });
});
