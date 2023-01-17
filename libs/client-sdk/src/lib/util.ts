export const objectKeys = <O extends object>(o: O) =>
  Object.keys(o) as (keyof O)[];

// export function uuidv4() {
//   return String(Number([1e7]) - 1e3 + -4e3 + -8e3 + -1e11).replace(
//     /[018]/g,
//     (cStr: string) => {
//       const c = Number(cStr);

//       return (
//         c ^
//         (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
//       ).toString(16);
//     }
//   );
// }
export function getRandomInt(givenMin: number, givenMax: number) {
  const min = Math.ceil(givenMin);
  const max = Math.floor(givenMax);

  return Math.floor(Math.random() * (max - min + 1)) + min;
}