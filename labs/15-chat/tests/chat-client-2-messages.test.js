// Ступень 2: ввод текста и сообщения от сервера.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startClient, tick } from './client-setup.js';

async function joined() {
  const started = startClient('ann');
  await started.server.next(); // join
  started.server.send({ type: 'welcome', users: ['ann'] });
  await tick();
  started.ui.printed.length = 0; // приветствие проверено в ступени 1
  return started;
}

test('typed text is sent as msg', async () => {
  const { client, ui, server } = await joined();
  ui.emit('line', 'Привет 😀');
  assert.deepEqual(await server.next(), { type: 'msg', text: 'Привет 😀' });
  client.quit();
});

test('empty input is ignored, invalid text is reported locally', async () => {
  const { client, ui, server } = await joined();
  ui.emit('line', '   ');
  ui.emit('line', 'x'.repeat(1001));
  assert.deepEqual(ui.printed, ['error Message is longer than 1000 characters']);
  ui.emit('line', 'ok');
  assert.deepEqual(await server.next(), { type: 'msg', text: 'ok' }); // ничего лишнего не ушло
  client.quit();
});

test('chat messages: own ones are marked', async () => {
  const { client, ui, server } = await joined();
  server.send({ type: 'msg', from: 'ann', text: 'mine', ts: 1 });
  server.send({ type: 'msg', from: 'bob', text: 'his', ts: 2 });
  await tick();
  assert.deepEqual(ui.printed, ['chat you: mine', 'chat bob: his']);
  client.quit();
});

test('system, users and errors after joining are printed', async () => {
  const { client, ui, server } = await joined();
  server.send({ type: 'system', text: 'bob joined the chat', ts: 1 });
  server.send({ type: 'users', users: ['ann', 'bob'] });
  server.send({ type: 'error', code: 'INVALID_TEXT', message: 'Message must not be empty' });
  server.send({ type: 'something-new' }); // неизвестный тип молча пропускается
  server.sendRaw('not json');
  await tick();
  assert.deepEqual(ui.printed, [
    'system bob joined the chat',
    'info Online (2): ann, bob',
    'error Message must not be empty',
    'error Received a malformed message from the server',
  ]);
  client.quit();
});
