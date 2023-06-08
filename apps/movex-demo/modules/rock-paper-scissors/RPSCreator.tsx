// import { useMovex, useMovexBoundResource, useMovexResource } from 'movex-react';
// import { DemoMovexDefinition } from 'apps/movex-demo/movex';
// import movexConfig, { Rps } from 'movex-examples';
// import { ResourceIdentifier } from 'movex-core-util';
// import { useEffect } from 'react';

// type Props = {
//   resourceType: 
//   onCreated: (rid: ResourceIdentifier) => {

//   }
// };

// export const PlayRPSButton: React.FC<Props> = (props) => {
//   const m = useMovex();

//   useEffect(() => {
//     if (m.connected) {
//       m.movex.register()
//     }
//   }, [m.connected])

//   return (
//     <div>
//       <button
//         onClick={() => {
//           rpsResource.create(Rps.initialState).map((item) => {
//             router.push(`/rps/${item.rid.resourceId}`);
//           });
//         }}
//       >
//         Play Rock Paper Scissors
//       </button>
//     </div>
//   );
// };
