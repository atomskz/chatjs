// Упражнения 2 и 3: тесты Room с подменённым временем.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Room, RoomError } from './room.js';

test('lists members in join order', () => {
  const room = new Room();
  room.join('bob');
  room.join('ann');
  assert.deepEqual(room.list(), ['bob', 'ann']);
});

test('rejects a taken nick', () => {
  const room = new Room();
  room.join('ann');
  assert.throws(() => room.join('ann'), { name: 'RoomError', code: 'NICK_TAKEN' });
  assert.ok(new RoomError('X', 'x') instanceof Error);
});

test('leave removes the member', () => {
  const room = new Room();
  room.join('ann');
  assert.equal(room.leave('ann'), true);
  assert.equal(room.leave('ann'), false);
  assert.deepEqual(room.list(), []);
});

test('uses the injected clock', () => {
  let time = 1000;
  const room = new Room({ now: () => time });
  room.join('ann');
  time = 5000;
  room.join('bob');
  assert.equal(room.joinedAt('ann'), 1000);
  assert.equal(room.joinedAt('bob'), 5000);
});

test('state is private', () => {
  const room = new Room();
  assert.equal(room.members, undefined);
  assert.deepEqual(Object.keys(room), []);
});
