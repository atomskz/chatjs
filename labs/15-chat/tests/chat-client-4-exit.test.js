// Ступень 4: выход и обрыв связи — код выхода зависит от состояния.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startClient, tick } from './client-setup.js';

test('Ctrl+C (quit from the UI) works like /quit', async () => {
  const { ui, server, exitCode } = startClient();
  await server.next(); // join
  server.send({ type: 'welcome', users: ['ann'] });
  await tick();
  ui.emit('quit');
  assert.deepEqual(await server.next(), { type: 'leave' });
  assert.equal(await exitCode, 0);
});

test('the server dropped the connection → "Connection to server lost", code 1', async () => {
  const { ui, server, exitCode } = startClient();
  await server.next(); // join
  server.send({ type: 'welcome', users: ['ann'] });
  await tick();
  server.close();
  assert.equal(await exitCode, 1);
  assert.equal(ui.printed.at(-1), 'error Connection to server lost');
  assert.ok(ui.isClosed, 'the UI must be closed, otherwise readline keeps the process alive');
});

test('quit before welcome still exits with code 0', async () => {
  const { client, ui, server, exitCode } = startClient();
  await server.next(); // join
  server.send({ type: 'welcome', users: ['ann'] }); // welcome уже в пути...
  client.quit(); // ...а пользователь вышел, не дождавшись его
  assert.equal(await exitCode, 0);
  assert.equal(ui.printed.at(-1), 'info Bye!');
});

test('quit twice sends leave only once', async () => {
  const { client, server, exitCode } = startClient();
  await server.next(); // join
  client.quit();
  client.quit();
  assert.deepEqual(await server.next(), { type: 'leave' });
  assert.equal(await exitCode, 0);
  await assert.rejects(server.next(), /closed/); // второго leave не было
});
