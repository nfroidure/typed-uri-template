import { YError } from 'yerror';
import type {
  ParameterMatcherBaseValue,
  ParameterMatcher,
} from './matchers.js';
export * from './matchers.js';

// URI Template as per the RFC 6570
// https://datatracker.ietf.org/doc/html/rfc6570

//https://github.com/geraintluff/uri-templates/blob/master/src/uri-templates.mjs#L109

const EXPLODE = '*' as const;
const TRUNCATE_SEPARATOR = ':' as const;
const DEFAULT_SPECS = {
  prefix: '',
  separator: ',',
  noEscape: false,
  named: false,
  trimEmptyString: false,
};
const MODIFIERS = ['+', '.', '/', '#', ';', '?', '&'] as const;
const MODIFIERS_SPECS: Record<
  (typeof MODIFIERS)[number],
  {
    prefix: string;
    separator: string;
    noEscape: boolean;
    named: boolean;
    trimEmptyString: boolean;
  }
> = {
  '+': {
    prefix: '',
    separator: ',',
    noEscape: true,
    named: false,
    trimEmptyString: false,
  },
  '#': {
    prefix: '#',
    separator: ',',
    noEscape: true,
    named: false,
    trimEmptyString: false,
  },
  '.': {
    prefix: '.',
    separator: '.',
    noEscape: false,
    named: false,
    trimEmptyString: false,
  },
  '/': {
    prefix: '/',
    separator: '/',
    noEscape: false,
    named: false,
    trimEmptyString: false,
  },
  ';': {
    prefix: ';',
    separator: ';',
    noEscape: false,
    named: true,
    trimEmptyString: true,
  },
  '?': {
    prefix: '?',
    separator: '&',
    noEscape: false,
    named: true,
    trimEmptyString: false,
  },
  '&': {
    prefix: '&',
    separator: '&',
    noEscape: false,
    named: true,
    trimEmptyString: false,
  },
};

export class URITemplate<T extends Record<string, ParameterMatcher<unknown>>> {
  private _template: string;
  private _matchers: T;
  private _parts: TemplatePart<unknown>[];

  constructor(template: string, matchers: T = {} as T) {
    this._template = template;
    this._matchers = matchers;
    this._parts = templateParser<unknown>(this._template, this._matchers);
  }

  toString(): string {
    return `["${this._template.replace(/"/g, '\\"')}" URITemplate]`;
  }

  serialize(params: {
    [P in keyof T]: T[P] extends ParameterMatcher<infer U> ? U : never;
  }): string {
    return this._parts
      .map((part) => {
        if (part.type === 'string') {
          return part.value;
        }
        if (part.type === 'substitution') {
          const { prefix, noEscape, named, separator, trimEmptyString } =
            part.modifier ? MODIFIERS_SPECS[part.modifier] : DEFAULT_SPECS;
          const results = part.variables
            .map((variable, index) => {
              const valueIsNullOrUndefined = params[variable.name] == null;

              if (valueIsNullOrUndefined) {
                return null;
              }

              const valueIsAnObject = typeof params[variable.name] === 'object';
              const valueIsAnArray =
                valueIsAnObject && Array.isArray(params[variable.name]);
              const valueIsARecord = valueIsAnObject && !valueIsAnArray;

              if (part.matchers[index].type === 'record' && !valueIsARecord) {
                throw new YError(
                  'E_EXPECTED_A_RECORD',
                  variable.name,
                  params[variable.name],
                );
              }
              if (part.matchers[index].type === 'list' && !valueIsAnArray) {
                throw new YError(
                  'E_EXPECTED_A_LIST',
                  variable.name,
                  params[variable.name],
                );
              }
              if (part.matchers[index].type === 'value' && valueIsAnObject) {
                throw new YError(
                  'E_EXPECTED_A_LITERAL_VALUE',
                  variable.name,
                  params[variable.name],
                );
              }

              const values = valueIsAnObject
                ? valueIsAnArray
                  ? (params[variable.name] as ParameterMatcherBaseValue<T>[])
                  : (Object.keys(
                      params[variable.name] as Record<
                        string,
                        ParameterMatcherBaseValue<T>
                      >,
                    ).map(
                      (key) => params[variable.name][key],
                    ) as ParameterMatcherBaseValue<T>[])
                : [params[variable.name] as ParameterMatcherBaseValue<T>];
              const serializedValues = values.map((value, valueIndex) => {
                if (!part.matchers[index].isValid(value)) {
                  throw new YError(
                    'E_INVALID_VARIABLE_VALUE',
                    variable.name,
                    valueIndex,
                    value,
                  );
                }
                return part.matchers[index].serialize(value);
              });
              const truncatedValues = serializedValues.map((serializedValue) =>
                'truncate' in variable
                  ? serializedValue.substring(0, variable.truncate)
                  : serializedValue,
              );
              const escapedValues = (
                valueIsARecord && !variable.explode
                  ? truncatedValues.reduce(
                      (acc, truncatedValue, index) => [
                        ...acc,
                        Object.keys(
                          params[variable.name] as Record<
                            string,
                            ParameterMatcherBaseValue<T>
                          >,
                        )[index],
                        truncatedValue,
                      ],
                      [] as string[],
                    )
                  : truncatedValues
              ).map((truncatedValue) =>
                noEscape ? doNotEscape(truncatedValue) : escape(truncatedValue),
              );
              const isEmpty =
                truncatedValues.length === 0 ||
                truncatedValues.every((value) => value === '');
              const variableNames = truncatedValues.map((_, index) => {
                const variableName =
                  valueIsARecord && variable.explode
                    ? Object.keys(
                        params[variable.name] as Record<
                          string,
                          ParameterMatcherBaseValue<T>
                        >,
                      )[index]
                    : variable.name;
                return (named || (variable.explode && valueIsARecord)) &&
                  (index === 0 || variable.explode)
                  ? (noEscape
                      ? doNotEscape(variableName)
                      : escape(variableName)) +
                      (trimEmptyString && isEmpty ? '' : '=')
                  : '';
              });

              if (isEmpty && valueIsARecord) {
                return null;
              }

              return escapedValues.reduce(
                (str, escapedValue, index) =>
                  str +
                  (index > 0 ? (variable.explode ? separator : ',') : '') +
                  (variableNames[index] || '') +
                  escapedValue,
                '',
              );
            })
            .filter((a) => a !== null);

          if (results.length === 0) {
            return '';
          }

          return prefix + results.join(separator);
        }
      })
      .join('');
  }
}

type LiteralPart = {
  index: number;
  type: 'string';
  value: string;
};
type SubstitutionPart<T> = {
  index: number;
  type: 'substitution';
  variables: {
    name: string;
    explode?: boolean;
    truncate?: number;
  }[];
  matchers: ParameterMatcher<T>[];
  modifier?: (typeof MODIFIERS)[number];
};
type TemplatePart<T> = LiteralPart | SubstitutionPart<T>;

export function templateParser<T>(
  template: string,
  matchers: Record<string, ParameterMatcher<T>>,
): TemplatePart<T>[] {
  const parts: TemplatePart<T>[] = [];
  const length = template.length;
  let currentPart:
    | (
        | LiteralPart
        | (Omit<SubstitutionPart<T>, 'matchers'> & {
            matchers?: SubstitutionPart<T>['matchers'];
          })
      )
    | undefined = undefined;

  for (let index = 0; index < length; index++) {
    if (template[index] === '{') {
      if (typeof currentPart !== 'undefined') {
        if (currentPart.type === 'substitution') {
          throw new YError('E_BAD_SUBSTITUTION_OPENING', template, index);
        }
        parts.push(currentPart);
      }

      currentPart = {
        index,
        type: 'substitution',
        variables: [{ name: '' }],
      };
      continue;
    }

    if (template[index] === '}') {
      if (typeof currentPart === 'undefined') {
        throw new YError('E_UNEXPECTED_SUBSTITUTION_CLOSING', template, index);
      }
      if (currentPart.type !== 'substitution') {
        throw new YError('E_UNEXPECTED_SUBSTITUTION_CLOSING', template, index);
      }
      if (currentPart.variables[currentPart.variables.length - 1].name === '') {
        throw new YError(
          'E_BAD_SUBSTITUTION_NAME',
          template,
          currentPart.index,
          index,
        );
      }
      for (const variable of currentPart.variables) {
        if (EXPLODE === variable.name[variable.name.length - 1]) {
          variable.explode = true;
          variable.name = variable.name.slice(0, -1);
        }
        if (variable.name.indexOf(TRUNCATE_SEPARATOR) !== -1) {
          if (!variable.name.split(':')[1].match(/^[0-9]+$/)) {
            throw new YError(
              'E_BAD_SUBSTITUTION_TRUNCATE',
              template,
              currentPart.index,
              index,
            );
          }
          variable.truncate = parseInt(variable.name.split(':')[1], 10);
          variable.name = variable.name.split(':')[0];
        }
        if ('truncate' in variable && 'explode' in variable) {
          throw new YError(
            'E_BAD_SUBSTITUTION_TRUNCATE',
            template,
            currentPart.index,
            index,
          );
        }
        if (!variable.name.match(/^(?:[A-Za-z0-9_]|%[0-9]{2}){1,}$/)) {
          throw new YError(
            'E_BAD_SUBSTITUTION_NAME',
            template,
            currentPart.index,
            index,
          );
        }
        if (!matchers[variable.name]) {
          throw new YError(
            'E_NO_SUBSTITUTION_MATCHER_FOUND',
            template,
            currentPart.index,
            index,
          );
        }
      }
      currentPart.matchers = currentPart.variables.map(
        (variable) => matchers[variable.name],
      );
      parts.push(currentPart as SubstitutionPart<T>);
      currentPart = undefined;
      continue;
    }
    if (
      typeof currentPart !== 'undefined' &&
      currentPart.type === 'substitution'
    ) {
      if (
        !('modifier' in currentPart) &&
        currentPart.variables[0].name === '' &&
        MODIFIERS.includes(template[index] as (typeof MODIFIERS)[number])
      ) {
        currentPart.modifier = template[index] as (typeof MODIFIERS)[number];
        continue;
      }
      if (template[index] === ',') {
        if (
          currentPart.variables[currentPart.variables.length - 1].name === ''
        ) {
          throw new YError(
            'E_EMPTY_SUBSTITUTION_NAME',
            template,
            currentPart.index,
            index,
          );
        }
        currentPart.variables.push({ name: '' });
        continue;
      }
      currentPart.variables[currentPart.variables.length - 1].name +=
        template[index];
      continue;
    }
    if (typeof currentPart === 'undefined') {
      currentPart = {
        index,
        type: 'string',
        value: template[index],
      };
      continue;
    }
    (currentPart as LiteralPart).value += template[index];
  }
  if (typeof currentPart !== 'undefined') {
    if (currentPart.type === 'string') {
      parts.push(currentPart);
    } else {
      throw new YError(
        'E_EXPECTED_SUBSTITUTION_CLOSING',
        template,
        currentPart.index,
        template.length,
      );
    }
  }

  return parts;
}

function escape(str: string): string {
  return encodeURIComponent(str).replace(/!/g, '%21');
}

function doNotEscape(str: string): string {
  return encodeURI(str).replace(/%25[0-9][0-9]/g, (doubleEncoded) => {
    return '%' + doubleEncoded.substring(3);
  });
}
