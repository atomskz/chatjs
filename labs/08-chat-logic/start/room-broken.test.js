// Упражнение 4: тесты, по которым нужно найти ошибки в room-broken.js.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Room } from './room-broken.js';

test('lists members in join order', () => {
  const room = new Room();
  room.join('bob');
  room.join('ann');
  assert.deepEqual(room.list(), ['bob', 'ann']);
});

test('rejects a taken nick', () => {
  const room = new Room();
  room.join('ann');
  assert.throws(() => room.join('ann'), { code: 'NICK_TAKEN' });
});

test('leave tells whether the member was there', () => {
  const room = new Room();
  room.join('ann');
  assert.equal(room.leave('ann'), true);
  assert.equal(room.leave('ann'), false);
});
