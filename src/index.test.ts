import { describe, test, expect } from '@jest/globals';
import {
  asKeyedBooleans,
  asKeyedNumbers,
  asKeyedStrings,
  asNumber,
  asNumbers,
  asString,
  asStrings,
  templateParser,
  URITemplate,
} from './index.js';
import { YError } from 'yerror';

describe('URITemplate', () => {
  describe('with a simple template', () => {
    const template = new URITemplate('/ping', {});

    describe('.toString()', () => {
      test('should work', () => {
        const result = template.toString();

        expect(result).toEqual('["/ping" URITemplate]');
      });
    });

    describe('.serialize()', () => {
      test('should work', () => {
        const result = template.serialize({});

        expect(result).toEqual('/ping');
      });
    });
  });

  describe('with a single matcher template', () => {
    const template = new URITemplate('{content}', {
      content: asString,
    });

    describe('.serialize()', () => {
      test('should work', () => {
        const result = template.serialize({
          content: 'test',
        });

        expect(result).toEqual('test');
      });
    });
  });

  describe('with a composed template', () => {
    const template = new URITemplate('/home/~{username}', {
      username: asString,
    });

    describe('.serialize()', () => {
      test('should work', () => {
        const result = template.serialize({
          username: 'nfroidure',
        });

        expect(result).toEqual('/home/~nfroidure');
      });
    });
  });

  describe('with a typed matcher template', () => {
    const template = new URITemplate('/fd/{fd}', {
      fd: asNumber,
    });

    describe('.serialize()', () => {
      test('should work', () => {
        const result = template.serialize({
          fd: 10,
        });

        expect(result).toEqual('/fd/10');
      });
    });
  });

  describe('with an unexpected value param', () => {
    const template = new URITemplate('/position/{coords}', {
      coords: asNumber,
    });

    describe('.serialize()', () => {
      test('should fail', () => {
        try {
          template.serialize({
            coords: [10] as unknown as number,
          });
          throw new YError('E_UNEXPECTED_SUCCESS');
        } catch (err) {
          expect(err).toMatchInlineSnapshot(
            `[YError: E_EXPECTED_A_LITERAL_VALUE (coords, 10): E_EXPECTED_A_LITERAL_VALUE]`,
          );
        }
      });
    });
  });

  describe('with an invalid value param', () => {
    const template = new URITemplate('/position/{coords}', {
      coords: asNumber,
    });

    describe('.serialize()', () => {
      test('should fail', () => {
        try {
          template.serialize({
            coords: '1000' as unknown as number,
          });
          throw new YError('E_UNEXPECTED_SUCCESS');
        } catch (err) {
          expect(err).toMatchInlineSnapshot(`[YError: E_INVALID_VARIABLE_VALUE (coords, 0, 1000): E_INVALID_VARIABLE_VALUE]`);
        }
      });
    });
  });

  describe('with an unexpected list param', () => {
    const template = new URITemplate('/position/{coords}', {
      coords: asNumbers,
    });

    describe('.serialize()', () => {
      test('should fail', () => {
        try {
          template.serialize({
            coords: 10 as unknown as number[],
          });
          throw new YError('E_UNEXPECTED_SUCCESS');
        } catch (err) {
          expect(err).toMatchInlineSnapshot(
            `[YError: E_EXPECTED_A_LIST (coords, 10): E_EXPECTED_A_LIST]`,
          );
        }
      });
    });
  });

  describe('with an unexpected record param', () => {
    const template = new URITemplate('/position/{coords}', {
      coords: asKeyedNumbers,
    });

    describe('.serialize()', () => {
      test('should fail', () => {
        try {
          template.serialize({
            coords: 10 as unknown as Record<string, number>,
          });
          throw new YError('E_UNEXPECTED_SUCCESS');
        } catch (err) {
          expect(err).toMatchInlineSnapshot(
            `[YError: E_EXPECTED_A_RECORD (coords, 10): E_EXPECTED_A_RECORD]`,
          );
        }
      });
    });
  });

  describe('with a complexer template', () => {
    const template = new URITemplate(
      '/~{username}/{+path}/{filename}{?from,to}',
      {
        username: asString,
        path: asString,
        filename: asString,
        from: asNumber,
        to: asNumber,
      },
    );

    describe('.serialize()', () => {
      test('should work', () => {
        const result = template.serialize({
          username: 'nfroidure',
          path: 'medias/music',
          filename: 'Highway To Hell.mp3',
          from: 0,
          to: 100,
        });

        expect(result).toEqual(
          '/~nfroidure/medias/music/Highway%20To%20Hell.mp3?from=0&to=100',
        );
      });
    });
  });

  describe('with level 1 templates', () => {
    const values = {
      var: 'value',
      hello: 'Hello World!',
    };
    const matchers = {
      var: asString,
      hello: asString,
    };
    const specs = [
      ['{var}', 'value'],
      ['{hello}', 'Hello%20World%21'],
    ];

    describe('.serialize()', () => {
      test('should work', () => {
        specs.forEach(([tpl, result]) => {
          const template = new URITemplate(tpl, matchers);

          expect([tpl, template.serialize(values)]).toEqual([tpl, result]);
        });
      });
    });
  });

  describe('with level 2 templates', () => {
    const values = {
      var: 'value',
      hello: 'Hello World!',
      path: '/foo/bar',
    };
    const matchers = {
      var: asString,
      hello: asString,
      path: asString,
    };
    const specs = [
      ['{+var}', 'value'],
      ['{+hello}', 'Hello%20World!'],
      ['{+path}/here', '/foo/bar/here'],
      ['here?ref={+path}', 'here?ref=/foo/bar'],
      ['X{#var}', 'X#value'],
      ['X{#hello}', 'X#Hello%20World!'],
    ];

    describe('.toString()', () => {
      test('should lead to the same template', () => {
        specs.forEach(([tpl]) => {
          const template = new URITemplate(tpl, matchers);

          expect(template.toString()).toEqual(`["${tpl}" URITemplate]`);
        });
      });
    });

    describe('.serialize()', () => {
      test('should work', () => {
        specs.forEach(([tpl, result]) => {
          const template = new URITemplate(tpl, matchers);

          expect([tpl, template.serialize(values)]).toEqual([tpl, result]);
        });
      });
    });
  });

  describe('with level 3 templates', () => {
    const values = {
      var: 'value',
      hello: 'Hello World!',
      empty: '',
      path: '/foo/bar',
      x: 1024,
      y: 768,
    };
    const matchers = {
      var: asString,
      hello: asString,
      empty: asString,
      path: asString,
      x: asNumber,
      y: asNumber,
    };
    const specs = [
      ['map?{x,y}', 'map?1024,768'],
      ['{x,hello,y}', '1024,Hello%20World%21,768'],
      ['map?{x,y}', 'map?1024,768'],
      ['{+x,hello,y}', '1024,Hello%20World!,768'],
      ['{+path,x}/here', '/foo/bar,1024/here'],
      ['{#x,hello,y}', '#1024,Hello%20World!,768'],
      ['{#path,x}/here', '#/foo/bar,1024/here'],
      ['X{.var}', 'X.value'],
      ['X{.x,y}', 'X.1024.768'],
      ['{/var}', '/value'],
      ['{;x,y}', ';x=1024;y=768'],
      ['{/var,x}/here', '/value/1024/here'],
      ['{;x,y,empty}', ';x=1024;y=768;empty'],
      ['{?x,y}', '?x=1024&y=768'],
      ['{?x,y,empty}', '?x=1024&y=768&empty='],
      ['?fixed=yes{&x}', '?fixed=yes&x=1024'],
      ['{&x,y,empty}', '&x=1024&y=768&empty='],
    ];

    describe('.toString()', () => {
      test('should lead to the same template', () => {
        specs.forEach(([tpl]) => {
          const template = new URITemplate(tpl, matchers);

          expect(template.toString()).toEqual(`["${tpl}" URITemplate]`);
        });
      });
    });

    describe('.serialize()', () => {
      test('should work', () => {
        specs.forEach(([tpl, result]) => {
          const template = new URITemplate(tpl, matchers);

          expect([tpl, template.serialize(values)]).toEqual([tpl, result]);
        });
      });
    });
  });

  describe('with level 4 templates', () => {
    const values = {
      var: 'value',
      hello: 'Hello World!',
      path: '/foo/bar!',
      list: ['red', 'green', 'blue'],
      keys: { semi: ';', dot: '.', comma: ',' },
    };
    const matchers = {
      var: asString,
      hello: asString,
      path: asString,
      list: asStrings,
      keys: asKeyedStrings,
    };
    const specs = [
      ['{var}', 'value'],
      ['{hello}', 'Hello%20World%21'],
      ['{var:3}', 'val'],
      ['{var:30}', 'value'],
      ['{list}', 'red,green,blue'],
      ['{list*}', 'red,green,blue'],
      ['{keys}', 'semi,%3B,dot,.,comma,%2C'],
      ['{keys*}', 'semi=%3B,dot=.,comma=%2C'],
      ['{+path:6}/here', '/foo/b/here'],
      ['{+list}', 'red,green,blue'],
      ['{+list*}', 'red,green,blue'],
      ['{+keys}', 'semi,;,dot,.,comma,,'],
      ['{+keys*}', 'semi=;,dot=.,comma=,'],
      ['{#path:6}/here', '#/foo/b/here'],
      ['{#list}', '#red,green,blue'],
      ['{#list*}', '#red,green,blue'],
      ['{#keys}', '#semi,;,dot,.,comma,,'],
      ['{#keys*}', '#semi=;,dot=.,comma=,'],
      ['X{.var:3}', 'X.val'],
      ['X{.list}', 'X.red,green,blue'],
      ['X{.list*}', 'X.red.green.blue'],
      ['X{.keys}', 'X.semi,%3B,dot,.,comma,%2C'],
      ['X{.keys*}', 'X.semi=%3B.dot=..comma=%2C'],
      ['{/var:1,var}', '/v/value'],
      ['{/list}', '/red,green,blue'],
      ['{/list*}', '/red/green/blue'],
      ['{/list*,path:4}', '/red/green/blue/%2Ffoo'],
      ['{/keys}', '/semi,%3B,dot,.,comma,%2C'],
      ['{/keys*}', '/semi=%3B/dot=./comma=%2C'],
      ['{;hello:5}', ';hello=Hello'],
      ['{;list}', ';list=red,green,blue'],
      ['{;list*}', ';list=red;list=green;list=blue'],
      ['{;keys}', ';keys=semi,%3B,dot,.,comma,%2C'],
      ['{;keys*}', ';semi=%3B;dot=.;comma=%2C'],
      ['{?var:3}', '?var=val'],
      ['{?list}', '?list=red,green,blue'],
      ['{?list*}', '?list=red&list=green&list=blue'],
      ['{?keys}', '?keys=semi,%3B,dot,.,comma,%2C'],
      ['{?keys*}', '?semi=%3B&dot=.&comma=%2C'],
      ['{&var:3}', '&var=val'],
      ['{&list}', '&list=red,green,blue'],
      ['{&list*}', '&list=red&list=green&list=blue'],
      ['{&keys}', '&keys=semi,%3B,dot,.,comma,%2C'],
      ['{&keys*}', '&semi=%3B&dot=.&comma=%2C'],
    ];

    describe('.toString()', () => {
      test('should lead to the same template', () => {
        specs.forEach(([tpl]) => {
          const template = new URITemplate(tpl, matchers);

          expect(template.toString()).toEqual(`["${tpl}" URITemplate]`);
        });
      });
    });

    describe('.serialize()', () => {
      test('should work', () => {
        specs.forEach(([tpl, result]) => {
          const template = new URITemplate(tpl, matchers);

          expect([tpl, template.serialize(values)]).toEqual([tpl, result]);
        });
      });
    });
  });

  describe('with more samples', () => {
    const values = {
      var: 'value',
      comma: ',',
      domain: ['insertafter', 'com'],
      address: { city: 'Oisy le Verger', state: 'FR' },
      addressNums: { postalCode: 62860 },
    };
    const matchers = {
      var: asString,
      comma: asString,
      domain: asStrings,
      address: asKeyedStrings,
      addressNums: asKeyedNumbers,
    };
    const specs = [
      ['{var}', 'value'],
      ['{var:0}', ''],
      ['{var:1}', 'v'],
      ['{var:4}', 'valu'],
      ['{var:5}', 'value'],
      ['{var:6}', 'value'],
      ['{comma:1}', '%2C'],
      ['{comma:2}', '%2C'],
      ['{comma:3}', '%2C'],
      ['{comma:4}', '%2C'],
      [
        '/mapper{?address*}{&addressNums*}',
        '/mapper?city=Oisy%20le%20Verger&state=FR&postalCode=62860',
      ],
    ];

    describe('.toString()', () => {
      test('should lead to the same template', () => {
        specs.forEach(([tpl]) => {
          const template = new URITemplate(tpl, matchers);

          expect(template.toString()).toEqual(`["${tpl}" URITemplate]`);
        });
      });
    });

    describe('.serialize()', () => {
      test('should work', () => {
        specs.forEach(([tpl, result]) => {
          const template = new URITemplate(tpl, matchers);

          expect([tpl, template.serialize(values)]).toEqual([tpl, result]);
        });
      });
    });
  });

  describe('with way more samples', () => {
    const values = {
      count: ['one', 'two', 'three'],
      dom: ['example', 'com'],
      dub: 'me/too',
      hello: 'Hello World!',
      half: '50%',
      var: 'value',
      who: 'fred',
      base: 'http://example.com/home/',
      path: '/foo/bar',
      list: ['red', 'green', 'blue'],
      keys: { semi: ';', dot: '.', comma: ',' },
      v: 6,
      x: 1024,
      y: 768,
      empty: '',
      emptyKeys: {},
      // Creating cases TypeScript wont permit
      bar: undefined as unknown as string,
      undef: undefined as unknown as string,
      null: null as unknown as string,
    };
    const matchers = {
      count: asStrings,
      dom: asStrings,
      dub: asString,
      hello: asString,
      half: asString,
      var: asString,
      bar: asString,
      who: asString,
      base: asString,
      path: asString,
      list: asStrings,
      keys: asKeyedStrings,
      v: asNumber,
      x: asNumber,
      y: asNumber,
      empty: asString,
      emptyKeys: asKeyedBooleans,
      undef: asString,
      null: asString,
    };
    const specs = [
      ['{count}', 'one,two,three'],
      ['{count*}', 'one,two,three'],
      ['{/count}', '/one,two,three'],
      ['{/count*}', '/one/two/three'],
      ['{;count}', ';count=one,two,three'],
      ['{;count*}', ';count=one;count=two;count=three'],
      ['{?count}', '?count=one,two,three'],
      ['{?count*}', '?count=one&count=two&count=three'],
      ['{&count*}', '&count=one&count=two&count=three'],
      ['{var}', 'value'],
      ['{hello}', 'Hello%20World%21'],
      ['{half}', '50%25'],
      ['O{empty}X', 'OX'],
      ['O{undef}X', 'OX'],
      ['O{null}X', 'OX'],
      ['{x,y}', '1024,768'],
      ['{x,hello,y}', '1024,Hello%20World%21,768'],
      ['?{x,empty}', '?1024,'],
      ['?{x,undef}', '?1024'],
      ['?{x,null}', '?1024'],
      ['?{undef,y}', '?768'],
      ['?{null,y}', '?768'],
      ['{var:3}', 'val'],
      ['{var:30}', 'value'],
      ['{list}', 'red,green,blue'],
      ['{list*}', 'red,green,blue'],
      ['{keys}', 'semi,%3B,dot,.,comma,%2C'],
      ['{keys*}', 'semi=%3B,dot=.,comma=%2C'],
      ['{+var}', 'value'],
      ['{+hello}', 'Hello%20World!'],
      ['{+half}', '50%25'],
      ['{base}index', 'http%3A%2F%2Fexample.com%2Fhome%2Findex'],
      ['{+base}index', 'http://example.com/home/index'],
      ['O{+empty}X', 'OX'],
      ['O{+undef}X', 'OX'],
      ['{+path}/here', '/foo/bar/here'],
      ['here?ref={+path}', 'here?ref=/foo/bar'],
      ['up{+path}{var}/here', 'up/foo/barvalue/here'],
      ['{+x,hello,y}', '1024,Hello%20World!,768'],
      ['{+path,x}/here', '/foo/bar,1024/here'],
      ['{+path:6}/here', '/foo/b/here'],
      ['{+list}', 'red,green,blue'],
      ['{+list*}', 'red,green,blue'],
      ['{+keys}', 'semi,;,dot,.,comma,,'],
      ['{+keys*}', 'semi=;,dot=.,comma=,'],
      ['{#var}', '#value'],
      ['{#hello}', '#Hello%20World!'],
      ['{#half}', '#50%25'],
      ['foo{#empty}', 'foo#'],
      ['foo{#undef}', 'foo'],
      ['{#x,hello,y}', '#1024,Hello%20World!,768'],
      ['{#path,x}/here', '#/foo/bar,1024/here'],
      ['{#path:6}/here', '#/foo/b/here'],
      ['{#list}', '#red,green,blue'],
      ['{#list*}', '#red,green,blue'],
      ['{#keys}', '#semi,;,dot,.,comma,,'],
      ['{#keys*}', '#semi=;,dot=.,comma=,'],
      ['{.who}', '.fred'],
      ['{.who,who}', '.fred.fred'],
      ['{.half,who}', '.50%25.fred'],
      ['www{.dom*}', 'www.example.com'],
      ['X{.var}', 'X.value'],
      ['X{.empty}', 'X.'],
      ['X{.undef}', 'X'],
      ['X{.var:3}', 'X.val'],
      ['X{.list}', 'X.red,green,blue'],
      ['X{.list*}', 'X.red.green.blue'],
      ['X{.keys}', 'X.semi,%3B,dot,.,comma,%2C'],
      ['X{.keys*}', 'X.semi=%3B.dot=..comma=%2C'],
      ['X{.emptyKeys}', 'X'],
      ['X{.emptyKeys*}', 'X'],
      ['{/who}', '/fred'],
      ['{/who,who}', '/fred/fred'],
      ['{/half,who}', '/50%25/fred'],
      ['{/who,dub}', '/fred/me%2Ftoo'],
      ['{/var}', '/value'],
      ['{/var,empty}', '/value/'],
      ['{/var,undef}', '/value'],
      ['{/var,x}/here', '/value/1024/here'],
      ['{/var:1,var}', '/v/value'],
      ['{/list}', '/red,green,blue'],
      ['{/list*}', '/red/green/blue'],
      ['{/list*,path:4}', '/red/green/blue/%2Ffoo'],
      ['{/keys}', '/semi,%3B,dot,.,comma,%2C'],
      ['{/keys*}', '/semi=%3B/dot=./comma=%2C'],
      ['{;who}', ';who=fred'],
      ['{;half}', ';half=50%25'],
      ['{;empty}', ';empty'],
      ['{;v,empty,who}', ';v=6;empty;who=fred'],
      ['{;v,bar,who}', ';v=6;who=fred'],
      ['{;x,y}', ';x=1024;y=768'],
      ['{;x,y,empty}', ';x=1024;y=768;empty'],
      ['{;x,y,undef}', ';x=1024;y=768'],
      ['{;hello:5}', ';hello=Hello'],
      ['{;list}', ';list=red,green,blue'],
      ['{;list*}', ';list=red;list=green;list=blue'],
      ['{;keys}', ';keys=semi,%3B,dot,.,comma,%2C'],
      ['{;keys*}', ';semi=%3B;dot=.;comma=%2C'],
      ['{?who}', '?who=fred'],
      ['{?half}', '?half=50%25'],
      ['{?x,y}', '?x=1024&y=768'],
      ['{?x,y,empty}', '?x=1024&y=768&empty='],
      ['{?x,y,undef}', '?x=1024&y=768'],
      ['{?var:3}', '?var=val'],
      ['{?list}', '?list=red,green,blue'],
      ['{?list*}', '?list=red&list=green&list=blue'],
      ['{?keys}', '?keys=semi,%3B,dot,.,comma,%2C'],
      ['{?keys*}', '?semi=%3B&dot=.&comma=%2C'],
      ['{&who}', '&who=fred'],
      ['{&half}', '&half=50%25'],
      ['?fixed=yes{&x}', '?fixed=yes&x=1024'],
      ['{&x,y,empty}', '&x=1024&y=768&empty='],
      ['{&x,y,undef}', '&x=1024&y=768'],
      ['{&var:3}', '&var=val'],
      ['{&list}', '&list=red,green,blue'],
      ['{&list*}', '&list=red&list=green&list=blue'],
      ['{&keys}', '&keys=semi,%3B,dot,.,comma,%2C'],
      ['{&keys*}', '&semi=%3B&dot=.&comma=%2C'],
    ];

    describe('.toString()', () => {
      test('should lead to the same template', () => {
        specs.forEach(([tpl]) => {
          const template = new URITemplate(tpl, matchers);

          expect(template.toString()).toEqual(`["${tpl}" URITemplate]`);
        });
      });
    });

    describe('.serialize()', () => {
      test('should work', () => {
        specs.forEach(([tpl, result]) => {
          const template = new URITemplate(tpl, matchers);

          expect([tpl, template.serialize(values)]).toEqual([tpl, result]);
        });
      });
    });
  });
});

describe('templateParser()', () => {
  describe('with valid templates', () => {
    test('should work', () => {
      expect(templateParser('/test', {})).toMatchInlineSnapshot(`
[
  {
    "index": 0,
    "type": "string",
    "value": "/test",
  },
]
`);
      expect(
  templateParser('/test/{param}', {
    param: asString
  })
).toMatchInlineSnapshot(`
[
  {
    "index": 0,
    "type": "string",
    "value": "/test/",
  },
  {
    "index": 6,
    "matchers": [
      {
        "isValid": [Function],
        "parse": [Function],
        "serialize": [Function],
        "type": "value",
      },
    ],
    "type": "substitution",
    "variables": [
      {
        "name": "param",
      },
    ],
  },
]
`);
      expect(
  templateParser('/position/{x,y,z}?relative=true{&origX,origY,origZ}', {
    x: asNumber,
    y: asNumber,
    z: asNumber,
    origX: asNumber,
    origY: asNumber,
    origZ: asNumber
  })
).toMatchInlineSnapshot(`
[
  {
    "index": 0,
    "type": "string",
    "value": "/position/",
  },
  {
    "index": 10,
    "matchers": [
      {
        "isValid": [Function],
        "parse": [Function],
        "serialize": [Function],
        "type": "value",
      },
      {
        "isValid": [Function],
        "parse": [Function],
        "serialize": [Function],
        "type": "value",
      },
      {
        "isValid": [Function],
        "parse": [Function],
        "serialize": [Function],
        "type": "value",
      },
    ],
    "type": "substitution",
    "variables": [
      {
        "name": "x",
      },
      {
        "name": "y",
      },
      {
        "name": "z",
      },
    ],
  },
  {
    "index": 17,
    "type": "string",
    "value": "?relative=true",
  },
  {
    "index": 31,
    "matchers": [
      {
        "isValid": [Function],
        "parse": [Function],
        "serialize": [Function],
        "type": "value",
      },
      {
        "isValid": [Function],
        "parse": [Function],
        "serialize": [Function],
        "type": "value",
      },
      {
        "isValid": [Function],
        "parse": [Function],
        "serialize": [Function],
        "type": "value",
      },
    ],
    "modifier": "&",
    "type": "substitution",
    "variables": [
      {
        "name": "origX",
      },
      {
        "name": "origY",
      },
      {
        "name": "origZ",
      },
    ],
  },
]
`);
    });
  });

  describe('with invalid templates', () => {
    test('should fail when substitution is not closed', () => {
      try {
        new URITemplate('{');
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err).toMatchInlineSnapshot(
          `[YError: E_EXPECTED_SUBSTITUTION_CLOSING ({, 0, 1): E_EXPECTED_SUBSTITUTION_CLOSING]`,
        );
      }
      try {
        new URITemplate('{/id');
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err).toMatchInlineSnapshot(
          `[YError: E_EXPECTED_SUBSTITUTION_CLOSING ({/id, 0, 4): E_EXPECTED_SUBSTITUTION_CLOSING]`,
        );
      }
      try {
        new URITemplate('hello {world');
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err).toMatchInlineSnapshot(
          `[YError: E_EXPECTED_SUBSTITUTION_CLOSING (hello {world, 6, 12): E_EXPECTED_SUBSTITUTION_CLOSING]`,
        );
      }
    });

    test('should fail when opening a substitution in an opened one', () => {
      try {
        new URITemplate('{{');
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err).toMatchInlineSnapshot(
          `[YError: E_BAD_SUBSTITUTION_OPENING ({{, 1): E_BAD_SUBSTITUTION_OPENING]`,
        );
      }
    });

    test('should fail when opening a substitution in an opened one', () => {
      try {
        new URITemplate('{{');
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err).toMatchInlineSnapshot(
          `[YError: E_BAD_SUBSTITUTION_OPENING ({{, 1): E_BAD_SUBSTITUTION_OPENING]`,
        );
      }
    });

    test('should fail when closing a not opened substitution', () => {
      try {
        new URITemplate('/id}');
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err).toMatchInlineSnapshot(
          `[YError: E_UNEXPECTED_SUBSTITUTION_CLOSING (/id}, 3): E_UNEXPECTED_SUBSTITUTION_CLOSING]`,
        );
      }
    });

    test('should fail with spaces in variables', () => {
      try {
        new URITemplate('{with space}');
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err).toMatchInlineSnapshot(
          `[YError: E_BAD_SUBSTITUTION_NAME ({with space}, 0, 11): E_BAD_SUBSTITUTION_NAME]`,
        );
      }
      try {
        new URITemplate('{ leading_space}');
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err).toMatchInlineSnapshot(
          `[YError: E_BAD_SUBSTITUTION_NAME ({ leading_space}, 0, 15): E_BAD_SUBSTITUTION_NAME]`,
        );
      }
      try {
        new URITemplate('{trailing_space }');
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err).toMatchInlineSnapshot(
          `[YError: E_BAD_SUBSTITUTION_NAME ({trailing_space }, 0, 16): E_BAD_SUBSTITUTION_NAME]`,
        );
      }
    });

    test('should fail with several modifiers', () => {
      try {
        new URITemplate('{/?id}');
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err).toMatchInlineSnapshot(
          `[YError: E_BAD_SUBSTITUTION_NAME ({/?id}, 0, 5): E_BAD_SUBSTITUTION_NAME]`,
        );
      }
    });

    test('should fail with official failures', () => {
      (
        [
          ['{/id*', 'E_EXPECTED_SUBSTITUTION_CLOSING'],
          ['/id*}', 'E_UNEXPECTED_SUBSTITUTION_CLOSING'],
          ['{/?id}', 'E_BAD_SUBSTITUTION_NAME'],
          ['{var:prefix}', 'E_BAD_SUBSTITUTION_TRUNCATE'],
          ['{hello:2*}', 'E_BAD_SUBSTITUTION_TRUNCATE'],
          ['{??hello}', 'E_BAD_SUBSTITUTION_NAME'],
          ['{!hello}', 'E_BAD_SUBSTITUTION_NAME'],
          ['{with space}', 'E_BAD_SUBSTITUTION_NAME'],
          ['{ leading_space}', 'E_BAD_SUBSTITUTION_NAME'],
          ['{trailing_space }', 'E_BAD_SUBSTITUTION_NAME'],
          ['{=path}', 'E_BAD_SUBSTITUTION_NAME'],
          ['{$var}', 'E_BAD_SUBSTITUTION_NAME'],
          ['{|var*}', 'E_BAD_SUBSTITUTION_NAME'],
          ['{*keys?}', 'E_BAD_SUBSTITUTION_NAME'],
          ['{?empty=default,var}', 'E_BAD_SUBSTITUTION_NAME'],
          ['{var}{-prefix|/-/|var}', 'E_BAD_SUBSTITUTION_NAME'],
          [
            '?q={searchTerms}&amp;c={example:color?}',
            'E_BAD_SUBSTITUTION_TRUNCATE',
          ],
          ['x{?empty|foo=none}', 'E_BAD_SUBSTITUTION_NAME'],
          ['/h{#hello+}', 'E_BAD_SUBSTITUTION_NAME'],
          ['/h#{hello+}', 'E_BAD_SUBSTITUTION_NAME'],
          ['?{-join|&|var,list}', 'E_BAD_SUBSTITUTION_NAME'],
          ['/people/{~thing}', 'E_BAD_SUBSTITUTION_NAME'],
          ['/{default-graph-uri}', 'E_BAD_SUBSTITUTION_NAME'],
          ['/sparql{?query,default-graph-uri}', 'E_BAD_SUBSTITUTION_NAME'],
          [
            '/sparql{?query){&default-graph-uri*}',
            'E_BAD_SUBSTITUTION_OPENING',
          ],
          ['/resolution{?x, y}', 'E_BAD_SUBSTITUTION_NAME'],
        ] as string[][]
      ).forEach(([tpl, code]) => {
        try {
          new URITemplate(tpl, {
            var: asString,
            searchTerms: asStrings,
            hello: asString,
            keys: asStrings,
            query: asString,
            x: asNumber,
          });
          throw new YError('E_UNEXPECTED_SUCCESS');
        } catch (err) {
          expect([tpl, (err as YError).code]).toEqual([tpl, code]);
        }
      });
    });
  });
});
