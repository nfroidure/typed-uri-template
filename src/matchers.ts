import { YError } from 'yerror';

export type ParameterMatcherBaseValue<T> =
  T extends Array<infer V> ? V : T extends Record<string, infer W> ? W : T;

export type ParameterMatcher<T> = {
  parse: (
    str: string,
  ) => T extends Array<infer V> ? V : T extends Record<string, infer W> ? W : T;
  serialize: <U extends T>(
    str: U extends Array<infer V>
      ? V
      : U extends Record<string, infer W>
        ? W
        : U,
  ) => string;
  isValid: <U extends T>(
    str: U extends Array<infer V>
      ? V
      : U extends Record<string, infer W>
        ? W
        : U,
  ) => boolean;
  type: 'value' | 'list' | 'record';
};

export const asString: ParameterMatcher<string> = {
  parse: (s) => s,
  serialize: (s) => s,
  isValid: (s) => typeof s === 'string',
  type: 'value',
};

export const asStrings: ParameterMatcher<string[]> = {
  ...asString,
  type: 'list',
};

export const asKeyedStrings: ParameterMatcher<Record<string, string>> = {
  ...asString,
  type: 'record',
};

export const asNumber: ParameterMatcher<number> = {
  parse: (s) => {
    const x = parseFloat(s);

    if (Number.isNaN(parseFloat(s))) {
      throw new YError('E_NOT_A_NUMBER', s);
    }
    if (s.toString() !== s) {
      throw new YError('E_NOT_A_CANONICAL_NUMBER_REPRESENTATION', s, s.toString());
    }
    return x;
  },
  serialize: (n) => n.toString(),
  isValid: (n) => typeof n === 'number',
  type: 'value',
};

export const asNumbers: ParameterMatcher<number[]> = {
  ...asNumber,
  type: 'list',
};

export const asKeyedNumbers: ParameterMatcher<Record<string, number>> = {
  ...asNumber,
  type: 'record',
};

export const asBoolean: ParameterMatcher<boolean> = {
  parse: (s) => {
    if (['true', 'false'].includes(s)) {
      throw new YError('E_CANNOT_PARSE_BOOLEAN', s);
    }
    return s === 'true';
  },
  serialize: (b) => b.toString(),
  isValid: (b) => typeof b === 'boolean',
  type: 'value',
};

export const asBooleans: ParameterMatcher<boolean[]> = {
  ...asBoolean,
  type: 'list',
};

export const asKeyedBooleans: ParameterMatcher<Record<string, boolean>> = {
  ...asBoolean,
  type: 'record',
};
