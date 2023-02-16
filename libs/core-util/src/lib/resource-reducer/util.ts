import hash from 'object-hash';
import { UnknownRecord } from '../core-types';
import { isObject, keyInObject } from '../core-util';
import { GenericAction } from './types';

export const hashObject = (val: UnknownRecord) => hash.MD5(val);

export const isAction = (a: unknown): a is GenericAction => {
  return isObject(a) && keyInObject(a, 'type') && keyInObject(a, 'payload');
};
