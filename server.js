// Шаг 1: эхо-сервер. Что клиент прислал, то сервер ему и вернул.
// Проверка: node server.js --port 5000, затем npx wscat -c ws://localhost:5000

import { parseArgs } from 'node:util';
import { WebSocketServer } from 'ws';

const { values } = parseArgs({ options: { port: { type: 'string', default: '5000' } } });
const port = Number(values.port);

const wss = new WebSocketServer({ port });

wss.on('listening', () => console.log(`Server listening on port ${port}`));
wss.on('error', (error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});

wss.on('connection', (socket, request) => {
  const address = `${request.socket.remoteAddress}:${request.socket.remotePort}`;
  console.log(`Connected: ${address}`);

  socket.on('message', (data) => socket.send(data.toString('utf8')));
  // Без обработчика 'error' любая сетевая ошибка уронит весь сервер.
  socket.on('error', (error) => console.error(`Error from ${address}: ${error.message}`));
  socket.on('close', () => console.log(`Disconnected: ${address}`));
});
