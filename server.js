// Шаг 2: сервер рассылает всё полученное всем подключённым.
// Проверка: откройте два-три wscat и пишите в любой из них.

import { parseArgs } from 'node:util';
import { WebSocketServer } from 'ws';

const { values } = parseArgs({ options: { port: { type: 'string', default: '5000' } } });
const port = Number(values.port);

// clientTracking: false — у библиотеки есть свой список клиентов,
// но по ТЗ рассылку пишем сами, поэтому ведём собственный список.
const wss = new WebSocketServer({ port, clientTracking: false });
const clients = new Set();

function broadcast(text) {
  for (const client of clients) {
    client.send(text);
  }
}

wss.on('listening', () => console.log(`Server listening on port ${port}`));
wss.on('error', (error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});

wss.on('connection', (socket, request) => {
  const address = `${request.socket.remoteAddress}:${request.socket.remotePort}`;
  console.log(`Connected: ${address}`);
  clients.add(socket);

  socket.on('message', (data) => broadcast(data.toString('utf8')));
  // Без обработчика 'error' любая сетевая ошибка уронит весь сервер.
  socket.on('error', (error) => console.error(`Error from ${address}: ${error.message}`));
  socket.on('close', () => {
    clients.delete(socket);
    console.log(`Disconnected: ${address}`);
  });
});
