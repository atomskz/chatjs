// Упражнение 2: тесты протокола из эталонного protocol.js.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  ErrorCode,
  MAX_TEXT_LENGTH,
  ProtocolError,
  ServerMessage,
  decode,
  encode,
  isValidNick,
  validateText,
} from '../../../protocol.js';

describe('encode / decode', () => {
  test('round trip keeps the message', () => {
    const message = ServerMessage.msg('ann', 'Привет 😀', 123);
    assert.deepEqual(decode(encode(message)), message);
  });

  for (const text of ['hello', '', 'null', '42', '[1]', '{"text":"hi"}', '{"type":5}']) {
    test(`rejects ${JSON.stringify(text)} with BAD_MESSAGE`, () => {
      assert.throws(
        () => decode(text),
        (error) => {
          assert.ok(error instanceof ProtocolError);
          assert.equal(error.code, ErrorCode.BAD_MESSAGE);
          return true;
        },
      );
    });
  }
});

describe('isValidNick', () => {
  test('accepts latin letters, digits, _ and -', () => {
    for (const nick of ['alice', 'bob_2', 'x-y', 'a'.repeat(20)]) {
      assert.ok(isValidNick(nick), nick);
    }
  });

  test('rejects everything else', () => {
    for (const nick of ['', 'a'.repeat(21), 'two words', 'Пётр', 'ann!', 'ann\n', 42, null]) {
      assert.equal(isValidNick(nick), false, String(nick));
    }
  });
});

describe('validateText', () => {
  test('accepts normal text', () => {
    assert.equal(validateText('hi'), null);
  });

  test('rejects empty and blank text', () => {
    assert.equal(validateText(''), 'Message must not be empty');
    assert.equal(validateText('   '), 'Message must not be empty');
  });

  test('counts emoji as one character', () => {
    assert.equal(validateText('😀'.repeat(MAX_TEXT_LENGTH)), null);
    assert.equal(
      validateText('😀'.repeat(MAX_TEXT_LENGTH + 1)),
      'Message is longer than 1000 characters',
    );
  });
});
