// Проверка из ТЗ: два сообщения, склеенные в один TCP-пакет,
// оба должны быть обработаны. Подключаемся «голым» сокетом, как nc.

import assert from 'node:assert/strict';
import net from 'node:net';
import readline from 'node:readline';
import { it } from 'node:test';
import * as tcp from '../transport/tcp.js';
import { startChatServer } from './helpers.js';

it('handles two messages glued into one TCP packet', async () => {
  const server = await startChatServer(tcp);
  const socket = net.connect({ host: '127.0.0.1', port: server.port });

  // То же, что printf '...\n...\n' | nc localhost 5000
  socket.write('{"type":"join","nick":"nc"}\n{"type":"msg","text":"hi"}\n');

  // readline удобно читает ответы сервера построчно.
  const types = [];
  for await (const line of readline.createInterface({ input: socket })) {
    types.push(JSON.parse(line).type);
    if (types.length === 2) break;
  }
  assert.deepEqual(types, ['welcome', 'msg']);

  socket.destroy();
  await server.stop();
});
