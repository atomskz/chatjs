// Ступень 2: регистрация по нику.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createChat } from './setup.js';

test('join → welcome with the list of users', async () => {
  const { connect } = createChat();
  const ann = connect();
  assert.deepEqual(await ann.join('ann'), { type: 'welcome', users: ['ann'] });
  const bob = connect();
  assert.deepEqual(await bob.join('bob'), { type: 'welcome', users: ['ann', 'bob'] });
});

test('others get "X joined the chat", the newcomer does not', async () => {
  const { connect } = createChat();
  const ann = connect();
  await ann.join('ann');
  const bob = connect();
  await bob.join('bob');

  const notice = await ann.next();
  assert.equal(notice.type, 'system');
  assert.equal(notice.text, 'bob joined the chat');
  assert.equal(typeof notice.ts, 'number');

  bob.send({ type: 'list' }); // следующим bob получит ответ на list, а не system о себе
  assert.equal((await bob.next()).type, 'users');
});

test('invalid nick → INVALID_NICK and the connection is closed', async () => {
  const client = createChat().connect();
  assert.equal((await client.join('bad nick!')).code, 'INVALID_NICK');
  await client.closed;
});

test('taken nick → NICK_TAKEN and the connection is closed', async () => {
  const { connect } = createChat();
  await connect().join('ann');
  const impostor = connect();
  assert.equal((await impostor.join('ann')).code, 'NICK_TAKEN');
  await impostor.closed;
});

test('second join → ALREADY_JOINED, the connection stays open', async () => {
  const client = createChat().connect();
  await client.join('ann');
  assert.equal((await client.join('ann2')).code, 'ALREADY_JOINED');
  client.send({ type: 'list' });
  assert.deepEqual(await client.next(), { type: 'users', users: ['ann'] });
});

test('a connection that has not joined gets no broadcasts', async () => {
  const { connect } = createChat();
  const lurker = connect();
  await connect().join('ann');
  lurker.send({ type: 'list' });
  assert.equal((await lurker.next()).code, 'NOT_JOINED'); // а не system «ann joined»
});
