// Ступень 1: разбор сообщений и ошибки до входа.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createChat } from './setup.js';

test('not JSON → BAD_MESSAGE', async () => {
  const client = createChat().connect();
  client.sendRaw('hello');
  assert.equal((await client.next()).code, 'BAD_MESSAGE');
});

test('JSON without a string type → BAD_MESSAGE', async () => {
  const client = createChat().connect();
  for (const text of ['null', '[1]', '{"text":"hi"}', '{"type":5}']) {
    client.sendRaw(text);
    assert.equal((await client.next()).code, 'BAD_MESSAGE', text);
  }
});

test('unknown type → UNKNOWN_TYPE, even before join', async () => {
  const client = createChat().connect();
  client.send({ type: 'dance' });
  const reply = await client.next();
  assert.equal(reply.type, 'error');
  assert.equal(reply.code, 'UNKNOWN_TYPE');
  assert.equal(typeof reply.message, 'string');
});

test('known type before join → NOT_JOINED', async () => {
  const client = createChat().connect();
  for (const message of [{ type: 'msg', text: 'hi' }, { type: 'list' }]) {
    client.send(message);
    assert.equal((await client.next()).code, 'NOT_JOINED');
  }
});

test('after errors the connection still works', async () => {
  const client = createChat().connect();
  client.sendRaw('garbage');
  await client.next();
  client.send({ type: 'list' });
  assert.equal((await client.next()).code, 'NOT_JOINED');
});
