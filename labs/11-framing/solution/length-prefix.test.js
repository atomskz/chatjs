// Упражнение 4 (бонус): тесты FrameDecoder.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FrameDecoder, encodeFrame } from './length-prefix.js';

test('frame header holds the payload length in bytes', () => {
  const frame = encodeFrame('Привет');
  assert.equal(frame.readUInt32BE(0), 12);
  assert.equal(frame.length, 16);
});

test('decodes two glued frames', () => {
  const decoder = new FrameDecoder();
  const chunk = Buffer.concat([encodeFrame('one'), encodeFrame('two')]);
  assert.deepEqual(decoder.push(chunk), ['one', 'two']);
});

test('decodes a frame split byte by byte, including emoji', () => {
  const decoder = new FrameDecoder();
  const frame = encodeFrame('hi 😀');
  const result = [];
  for (const byte of frame) {
    result.push(...decoder.push(Buffer.from([byte])));
  }
  assert.deepEqual(result, ['hi 😀']);
});

test('allows newlines and empty payloads', () => {
  const decoder = new FrameDecoder();
  const chunk = Buffer.concat([encodeFrame('a\nb'), encodeFrame('')]);
  assert.deepEqual(decoder.push(chunk), ['a\nb', '']);
});

test('rejects a frame that is too large before it arrives', () => {
  const decoder = new FrameDecoder({ maxFrameBytes: 10 });
  const header = Buffer.alloc(4);
  header.writeUInt32BE(1_000_000);
  assert.throws(() => decoder.push(header), /larger than 10/);
});
