// Упражнение 4: сервер БЕЗ обработчика 'error' на сокете — так делать нельзя.
// node fragile-server.js, затем в другом терминале: node reset-client.js
// Сервер упадёт с «Error: read ECONNRESET ... Emitted 'error' event».

import net from 'node:net';

const server = net.createServer((socket) => {
  console.log('client connected');
  socket.on('data', (chunk) => socket.write(chunk));
  // socket.on('error', (error) => console.log(`error: ${error.code}`)); // ← раскомментируйте
});

server.listen(5000, () => console.log('listening on port 5000'));
