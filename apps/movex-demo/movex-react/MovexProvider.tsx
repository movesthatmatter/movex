// TODO: This shold come from the library

import React, { useEffect, useState } from 'react';
import { initMovex } from 'libs/movex/src/lib/client';
import { MovexContextProps, MovexContext } from './MovexContext';
import { invoke } from 'movex-core-util';
import { BaseMovexDefinedResourcesMap, MovexConfig } from './types';

type Props<TMovexConfigResourcesMap extends BaseMovexDefinedResourcesMap> =
  React.PropsWithChildren<{
    movexConfig: MovexConfig<TMovexConfigResourcesMap>;
  }>;

// type State = {
//   contextState: MovexContextProps<>;
// };

export const MovexProvider: React.FC<Props<{}>> = (props) => {
  const [contextState, setContextState] = useState<
    MovexContextProps<typeof props['movexConfig']['resources']>
  >({
    connected: false,
    clientId: undefined,
  });

  useEffect(() => {
    invoke(async () => {
      // TODO: This doesn't belong here. It's a next thing so should be in a next socket provider or smtg
      await fetch('/api/socket');

      initMovex((movex) => {
        setContextState({
          connected: true,
          clientId: movex.getClientId(), // TODO: Do I really need this?
          movex,
          movexConfig: props.movexConfig,
        });
      });
    });
  }, []);

  return (
    <MovexContext.Provider value={contextState}>
      {props.children}
    </MovexContext.Provider>
  );
};

// export class MovexProviderClass<
//   TMovexConfigReducersMap extends BaseMovexDefinedReducersMap
// > extends React.Component<Props<TMovexConfigReducersMap>, State> {
//   override render() {
//     return (
//       <MovexContext.Provider value={this.state.contextState}>
//         {this.props.children}
//       </MovexContext.Provider>
//     );
//   }
// }
