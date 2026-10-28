// Упражнение 1: что JSON умеет и чего не умеет.

const values = {
  'plain object': { nick: 'ann', age: 30 },
  'undefined field': { a: 1, b: undefined },
  function: { run: () => 1 },
  NaN: { x: NaN },
  Date: { at: new Date(0) },
  'array with undefined': [1, undefined, 3],
  'nested string with newline': { text: 'line 1\nline 2' },
};

for (const [label, value] of Object.entries(values)) {
  console.log(`${label.padEnd(28)} → ${JSON.stringify(value)}`);
}

try {
  JSON.stringify({ big: 10n });
} catch (error) {
  console.log(`${'BigInt'.padEnd(28)} → ${error.name}: ${error.message}`);
}

const parsed = JSON.parse('{"at":"1970-01-01T00:00:00.000Z"}');
console.log(`Date after round trip is a ${typeof parsed.at}`);

for (const text of ['{"a":1}', "{'a':1}", '{"a":1,}', '', 'null', '[1,2]', '"hi"']) {
  try {
    const result = JSON.parse(text);
    console.log(`parse ${JSON.stringify(text).padEnd(10)} → ${JSON.stringify(result)}`);
  } catch (error) {
    console.log(`parse ${JSON.stringify(text).padEnd(10)} → ${error.name}`);
  }
}
