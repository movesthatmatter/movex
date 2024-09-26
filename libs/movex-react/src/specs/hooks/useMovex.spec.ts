import { renderHook } from '@testing-library/react';
import { useMovex } from '../../lib/hooks';

describe('useMovex', () => {
  test('it should return the correct context value', () => {
    const movexConfigMock = {
      resources: {},
    };

    const { result } = renderHook(() => useMovex(movexConfigMock));

    expect(result.current.movex).toBeUndefined();
    expect(result.current.client).toBeUndefined();
    expect(result.current.status).toEqual('initiating');
  });
});

// TODO: Add more tests