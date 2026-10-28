// Ступень 1: вход в чат.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startClient, tick } from './client-setup.js';

test('sends join right away', async () => {
  const { client, server } = startClient('ann');
  assert.deepEqual(await server.next(), { type: 'join', nick: 'ann' });
  client.quit();
});

test('welcome → greeting and the list of users', async () => {
  const { client, ui, server } = startClient('ann');
  await server.next(); // join
  server.send({ type: 'welcome', users: ['bob', 'ann'] });
  await tick();
  assert.deepEqual(ui.printed, [
    'system Welcome, ann! Type /help for commands',
    'info Online (2): bob, ann',
  ]);
  client.quit();
});

test('an error while joining → message, exit code 1', async () => {
  const { ui, server, exitCode } = startClient('ann');
  await server.next(); // join
  server.send({ type: 'error', code: 'NICK_TAKEN', message: 'Nickname "ann" is already taken' });
  assert.equal(await exitCode, 1);
  assert.deepEqual(ui.printed, ['error Cannot join: Nickname "ann" is already taken (NICK_TAKEN)']);
  assert.ok(ui.isClosed, 'the UI is closed when the connection is closed');
});
