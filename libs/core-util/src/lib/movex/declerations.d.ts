// export interface DifferenceCreate {
//   type: 'CREATE';
//   path: (string | number)[];
//   value: any;
// }
// export interface DifferenceRemove {
//   type: 'REMOVE';
//   path: (string | number)[];
//   oldValue: any;
// }
// export interface DifferenceChange {
//   type: 'CHANGE';
//   path: (string | number)[];
//   value: any;
//   oldValue: any;
// }
// export declare type Difference =
//   | DifferenceCreate
//   | DifferenceRemove
//   | DifferenceChange;
// export interface Options {
//   cyclesFix: boolean;
// }
// export default function diff(
//   obj: Record<string, any> | any[],
//   newObj: Record<string, any> | any[],
//   options?: Partial<Options>,
//   _stack?: Record<string, any>[]
// ): Difference[];
// // export {};
