// Упражнение 6: рассылка всем на WebSocket. Список клиентов ведём сами.
// node ws-broadcast-server.js, затем несколько npx wscat -c ws://localhost:5000

import { once } from 'node:events';
import http from 'node:http';
import { WebSocketServer } from 'ws';

const port = Number(process.argv[2] ?? 5000);
const sockets = new Set();

const httpServer = http.createServer((req, res) => {
  res.writeHead(426).end('Upgrade Required\n');
});
httpServer.listen(port);
await once(httpServer, 'listening');

// clientTracking: false — встроенный список wss.clients нам не нужен.
const wss = new WebSocketServer({ server: httpServer, clientTracking: false });

wss.on('connection', (socket, request) => {
  const name = `${request.socket.remoteAddress}:${request.socket.remotePort}`;
  sockets.add(socket);
  console.log(`+ ${name} (online: ${sockets.size})`);

  socket.on('message', (data) => {
    for (const other of sockets) {
      if (other !== socket) other.send(`[${name}] ${data}`);
    }
  });
  socket.on('error', () => {}); // причину узнаем в 'close'
  socket.on('close', () => {
    sockets.delete(socket);
    console.log(`- ${name} (online: ${sockets.size})`);
  });
});

console.log(`ws://localhost:${port}`);
