// Ступень 4: выход и обрыв связи.

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
  return { ann, bob, connect };
}

test('leave closes the connection and others get "X left the chat"', async () => {
  const { ann, bob } = await twoUsers();
  bob.send({ type: 'leave' });
  await bob.closed;
  const notice = await ann.next();
  assert.equal(notice.type, 'system');
  assert.equal(notice.text, 'bob left the chat');
});

test('a dropped connection is handled the same way', async () => {
  const { ann, bob } = await twoUsers();
  await bob.close(); // «закрыли терминал» — без leave
  assert.equal((await ann.next()).text, 'bob left the chat');
});

test('the nick becomes free after leaving', async () => {
  const { ann, bob, connect } = await twoUsers();
  await bob.close();
  await ann.next(); // bob left
  assert.equal((await connect().join('bob')).type, 'welcome');
});

test('a client that never joined leaves silently', async () => {
  const { ann, connect } = await twoUsers();
  await connect().close();
  ann.send({ type: 'list' });
  assert.equal((await ann.next()).type, 'users'); // не было «left the chat»
});
