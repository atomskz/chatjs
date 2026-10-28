import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LineSplitter } from '../transport/line-splitter.js';

describe('LineSplitter', () => {
  it('splits glued messages from one chunk', () => {
    const splitter = new LineSplitter();
    assert.deepEqual(splitter.push(Buffer.from('{"a":1}\n{"b":2}\n')), ['{"a":1}', '{"b":2}']);
  });

  it('keeps an incomplete message until the rest arrives', () => {
    const splitter = new LineSplitter();
    assert.deepEqual(splitter.push(Buffer.from('{"text":"hel')), []);
    assert.deepEqual(splitter.push(Buffer.from('lo"}\n{"te')), ['{"text":"hello"}']);
    assert.deepEqual(splitter.push(Buffer.from('xt":"!"}\n')), ['{"text":"!"}']);
  });

  it('restores a multibyte UTF-8 character split between chunks', () => {
    const bytes = Buffer.from('Привет 😀\n');
    const splitter = new LineSplitter();
    // Режем посередине «П» (2 байта) и посередине эмодзи (4 байта).
    const lines = [
      ...splitter.push(bytes.subarray(0, 1)),
      ...splitter.push(bytes.subarray(1, 14)),
      ...splitter.push(bytes.subarray(14)),
    ];
    assert.deepEqual(lines, ['Привет 😀']);
  });

  it('accepts \\r\\n line endings and skips empty lines', () => {
    const splitter = new LineSplitter();
    assert.deepEqual(splitter.push(Buffer.from('one\r\n\r\n\ntwo\n')), ['one', 'two']);
  });

  it('throws when a line exceeds the limit', () => {
    const splitter = new LineSplitter({ maxLineLength: 10 });
    assert.throws(() => splitter.push(Buffer.from('x'.repeat(11))));
  });
});
