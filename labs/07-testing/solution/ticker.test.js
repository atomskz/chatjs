// Упражнение 4: тесты класса с событиями из лабораторной 5 и хуки.

import assert from 'node:assert/strict';
import { on, once } from 'node:events';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { Ticker } from '../../05-events/solution/ticker.js';

describe('Ticker', () => {
  let ticker;

  beforeEach(() => {
    ticker = new Ticker();
  });

  afterEach(() => {
    ticker.stop(); // даже если тест упал, таймер не должен держать процесс
  });

  test('emits ticks 1..count and then done', async () => {
    ticker.start({ intervalMs: 5, count: 3 });
    const ticks = [];
    for await (const [n] of on(ticker, 'tick', { close: ['done'] })) {
      ticks.push(n);
    }
    assert.deepEqual(ticks, [1, 2, 3]);
  });

  test('emits error at failAt', async () => {
    ticker.start({ intervalMs: 5, count: 5, failAt: 2 });
    await assert.rejects(once(ticker, 'done'), /Tick 2 failed/);
  });
});
