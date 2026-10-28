// Ступень 3: сообщения чата и список участников.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createChat } from './setup.js';

async function twoUsers() {
  const { connect } = createChat();
  const ann = connect();
  const bob = connect();
  await ann.join('ann');
  await bob.join('bob');
  await ann.next(); // bob joined the chat
  return { ann, bob };
}

test('msg goes to everyone, including the sender', async () => {
  const { ann, bob } = await twoUsers();
  ann.send({ type: 'msg', text: 'Привет 😀' });
  for (const client of [ann, bob]) {
    const message = await client.next();
    assert.equal(message.type, 'msg');
    assert.equal(message.from, 'ann');
    assert.equal(message.text, 'Привет 😀');
  }
});

test('from and ts are set by the server', async () => {
  const { ann } = await twoUsers();
  const before = Date.now();
  ann.send({ type: 'msg', text: 'hi', from: 'admin', ts: 0 });
  const message = await ann.next();
  assert.equal(message.from, 'ann');
  assert.ok(message.ts >= before, 'ts must be the server time');
});

test('empty, blank, missing or too long text → INVALID_TEXT', async () => {
  const { ann, bob } = await twoUsers();
  for (const text of ['', '   ', undefined, 'x'.repeat(1001)]) {
    ann.send({ type: 'msg', text });
    assert.equal((await ann.next()).code, 'INVALID_TEXT', JSON.stringify(text));
  }
  bob.send({ type: 'msg', text: 'ok' }); // bob не получил ни одного из плохих сообщений
  assert.equal((await bob.next()).text, 'ok');
});

test('list → users in join order', async () => {
  const { bob } = await twoUsers();
  bob.send({ type: 'list' });
  assert.deepEqual(await bob.next(), { type: 'users', users: ['ann', 'bob'] });
});
