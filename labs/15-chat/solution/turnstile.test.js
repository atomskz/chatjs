// Упражнение 1: тесты автомата турникета — по тесту на строку или группу строк таблицы.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Turnstile } from './turnstile.js';

test('starts locked', () => {
  assert.equal(new Turnstile().state, 'locked');
});

test('locked + coin → unlocked', () => {
  const turnstile = new Turnstile();
  assert.equal(turnstile.coin(), 'unlocked, come in');
  assert.equal(turnstile.state, 'unlocked');
});

test('locked + push → stays locked', () => {
  const turnstile = new Turnstile();
  assert.equal(turnstile.push(), 'locked, insert a coin');
  assert.equal(turnstile.state, 'locked');
});

test('unlocked + coin → coin returned, stays unlocked', () => {
  const turnstile = new Turnstile();
  turnstile.coin();
  assert.equal(turnstile.coin(), 'already unlocked, coin returned');
  assert.equal(turnstile.state, 'unlocked');
});

test('unlocked + push → locked again', () => {
  const turnstile = new Turnstile();
  turnstile.coin();
  assert.equal(turnstile.push(), 'passed, locked again');
  assert.equal(turnstile.state, 'locked');
});

test('breaks down from any state and ignores coins and pushes', () => {
  for (const prepare of [() => {}, (t) => t.coin()]) {
    const turnstile = new Turnstile();
    prepare(turnstile);
    turnstile.breakDown();
    assert.equal(turnstile.coin(), 'out of order, coin returned');
    assert.equal(turnstile.push(), 'out of order');
    assert.equal(turnstile.state, 'broken');
  }
});

test('repair → locked; repairing a working turnstile changes nothing', () => {
  const turnstile = new Turnstile();
  assert.equal(turnstile.repair(), 'nothing to repair');
  turnstile.breakDown();
  assert.equal(turnstile.repair(), 'repaired, locked');
  assert.equal(turnstile.state, 'locked');
});
