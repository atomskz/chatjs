// Упражнение 1: табличные тесты для parsePort из эталонного lib/cli.js.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { UsageError, parsePort, requireOption } from '../../../lib/cli.js';

describe('parsePort', () => {
  for (const [input, expected] of [
    ['1', 1],
    ['5000', 5000],
    ['65535', 65535],
  ]) {
    test(`accepts "${input}"`, () => {
      assert.equal(parsePort(input), expected);
    });
  }

  for (const input of ['0', '65536', 'abc', '', ' 80', '5.5', '1e3', '-1']) {
    test(`rejects "${input}"`, () => {
      assert.throws(() => parsePort(input), UsageError);
    });
  }
});

describe('requireOption', () => {
  test('returns the value when it is present', () => {
    assert.equal(requireOption({ port: '5000' }, 'port'), '5000');
  });

  test('throws UsageError with the option name', () => {
    // Вторым аргументом можно передать функцию-проверку: она получает ошибку
    // и должна вернуть true (или сама упасть на assert внутри).
    assert.throws(
      () => requireOption({}, 'port'),
      (error) => error instanceof UsageError && error.message === 'Option --port is required',
    );
  });
});
