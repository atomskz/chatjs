// Упражнение 3: асинхронные тесты для delay и withTimeout из лабораторной 4.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { delay, withTimeout } from '../../04-async/solution/async-utils.js';

test('delay resolves with the value', async () => {
  assert.equal(await delay(10, 'hi'), 'hi');
});

test('withTimeout passes through a fast promise', async () => {
  assert.equal(await withTimeout(delay(10, 'fast'), 1000), 'fast');
});

test('withTimeout rejects a slow promise with ETIMEDOUT', async () => {
  await assert.rejects(withTimeout(delay(1000), 20), { code: 'ETIMEDOUT' });
});

test('withTimeout passes through the original error', async () => {
  const failing = Promise.reject(new Error('boom'));
  await assert.rejects(withTimeout(failing, 1000), { message: 'boom' });
});

test('delay with mocked timers does not really wait', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const promise = delay(60_000, 'a minute later');
  t.mock.timers.tick(60_000); // «перематываем» время вперёд
  assert.equal(await promise, 'a minute later');
});
