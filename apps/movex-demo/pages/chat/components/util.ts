// import { MovexClientResource } from 'libs/movex/src/lib/client/MovexClientResource';
// import { Movex } from 'movex';
// import { ResourceIdentifier } from 'movex-core-util';
// import { useEffect, useMemo, useState } from 'react';

// export const useMovexReducer = (
//   movexResource: ReturnType<Movex['register']>, // TODO: Change with a defined type
//   rid: ResourceIdentifier<string>
// ) => {

//   const chatResource = useMemo(
//     () => movex.register(resourceType, chatReducer),
//     [movex]
//   );

//   // const [resource, setResource] = useState<MovexClientResource>([
//   //   noop
//   // ]);

//   // useEffect(() => {
//   //   setResource(movexResource.bind(rid));
//   // }, [rid]);

//   // return resource;
// };
