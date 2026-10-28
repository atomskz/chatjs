// Ступень 5: граница ошибок и логи.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createChat } from './setup.js';

function recordingLogger() {
  const lines = [];
  return {
    lines,
    info: (text) => lines.push(`info ${text}`),
    warn: (text) => lines.push(`warn ${text}`),
    error: (text) => lines.push(`error ${text}`),
  };
}

test('logs connect, join, errors and disconnect', async () => {
  const logger = recordingLogger();
  const { connect } = createChat(logger);
  const client = connect();
  await client.join('ann');
  client.sendRaw('garbage');
  await client.next();
  await client.close();
  // Серверный конец узнаёт о закрытии на виток цикла событий позже клиентского.
  await new Promise((resolve) => setImmediate(resolve));

  const log = logger.lines.join('\n');
  assert.match(log, /^info .*fake-client/m, 'connect: info with remoteAddress');
  assert.match(log, /^info .*ann/m, 'join: info with the nick');
  assert.match(log, /^warn .*BAD_MESSAGE/m, 'every error sent to a client: warn with the code');
  assert.ok(logger.lines.length >= 4, 'disconnect is logged too');
});

test('an exception while handling a message → INTERNAL_ERROR, the server keeps working', async () => {
  // Логгер, который «ломается» при записи о входе пользователя crash-me.
  const logger = recordingLogger();
  const info = logger.info;
  logger.info = (text) => {
    if (text.includes('crash-me')) throw new Error('logger is broken');
    info(text);
  };
  const { connect } = createChat(logger);

  const victim = connect();
  victim.send({ type: 'join', nick: 'crash-me' });
  assert.equal((await victim.next()).code, 'INTERNAL_ERROR');
  assert.match(logger.lines.join('\n'), /logger is broken/, 'error log with the stack');

  assert.equal((await connect().join('ann')).type, 'welcome'); // остальные не пострадали
});
