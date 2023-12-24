import { ResourceIdentifier } from 'movex-core-util';
import movexConfig from 'movex-examples';
import { MovexBoundResource } from 'movex-react';

type Props = {
  rid: ResourceIdentifier<'counter'>;
};

export function CounterPanel({ rid }: Props) {
  return (
    <MovexBoundResource
      rid={rid}
      movexDefinition={movexConfig}
      render={({ boundResource: { state, dispatch } }) => {
        return (
          <div className="text-center">
            <h2 className="text-4xl">{state.value}</h2>
            <div>
              <button
                className="p-3 bg-red-100"
                onClick={() => {
                  dispatch({ type: 'increment' });
                }}
              >
                +
              </button>
              <button
                className="p-3 bg-blue-100"
                onClick={() => {
                  dispatch({ type: 'decrement' });
                }}
              >
                -
              </button>
            </div>
          </div>
        );
      }}
    />
  );
}
