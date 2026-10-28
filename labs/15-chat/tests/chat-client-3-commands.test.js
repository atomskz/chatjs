// Ступень 3: команды.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startClient, tick } from './client-setup.js';

async function joined() {
  const started = startClient('ann');
  await started.server.next(); // join
  started.server.send({ type: 'welcome', users: ['ann'] });
  await tick();
  started.ui.printed.length = 0;
  return started;
}

test('/users asks the server for the list', async () => {
  const { client, ui, server } = await joined();
  ui.emit('line', '/users');
  assert.deepEqual(await server.next(), { type: 'list' });
  client.quit();
});

test('/help prints the commands locally', async () => {
  const { client, ui } = await joined();
  ui.emit('line', '/help');
  assert.equal(ui.printed.length, 1);
  assert.match(ui.printed[0], /^info Commands:/);
  for (const command of ['/users', '/quit', '/help']) {
    assert.ok(ui.printed[0].includes(command), command);
  }
  client.quit();
});

test('an unknown command is reported locally and not sent', async () => {
  const { client, ui, server } = await joined();
  ui.emit('line', '/dance');
  assert.deepEqual(ui.printed, [
    'error Unknown command /dance. Type /help for the list of commands',
  ]);
  ui.emit('line', '/users');
  assert.deepEqual(await server.next(), { type: 'list' }); // /dance на сервер не ушёл
  client.quit();
});

test('/quit sends leave, says Bye! and exits with code 0', async () => {
  const { ui, server, exitCode } = await joined();
  ui.emit('line', '/quit');
  assert.deepEqual(await server.next(), { type: 'leave' });
  assert.equal(await exitCode, 0);
  assert.deepEqual(ui.printed, ['info Bye!']);
  assert.ok(ui.isClosed);
});
