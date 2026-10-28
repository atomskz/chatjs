// Упражнения 4 и 5: WebSocket эхо-сервер поверх HTTP-сервера.
// node ws-echo-server.js, затем npx wscat -c ws://localhost:5000 или node ws-client.js

import { once } from 'node:events';
import http from 'node:http';
import { WebSocketServer } from 'ws';

const port = Number(process.argv[2] ?? 5000);

const httpServer = http.createServer((req, res) => {
  // Сюда попадают обычные запросы без Upgrade.
  res.writeHead(426, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Upgrade Required: this is a WebSocket server\n');
});

httpServer.listen(port);
await once(httpServer, 'listening');

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (socket, request) => {
  const address = `${request.socket.remoteAddress}:${request.socket.remotePort}`;
  console.log(`connected: ${address}, key ${request.headers['sec-websocket-key']}`);

  socket.on('message', (data, isBinary) => {
    // data — Buffer. Одно событие = ровно одно сообщение, которое прислал клиент.
    const text = data.toString('utf8');
    console.log(`message from ${address}: ${JSON.stringify(text)} (binary: ${isBinary})`);
    socket.send(`echo: ${text}`);
  });
  socket.on('error', (error) => console.log(`error on ${address}: ${error.message}`));
  socket.on('close', (code, reason) => {
    console.log(`closed: ${address}, code ${code}, reason ${JSON.stringify(reason.toString())}`);
  });
});

console.log(`ws://localhost:${port}`);
