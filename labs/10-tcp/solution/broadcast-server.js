// Упражнение 5: всё, что прислал один клиент, получают все остальные.
// Запустите и подключите 2–3 клиента: nc localhost 5000 или node client.js.

import net from 'node:net';

const port = Number(process.argv[2] ?? 5000);
const sockets = new Set();

const server = net.createServer((socket) => {
  const name = `${socket.remoteAddress}:${socket.remotePort}`;
  sockets.add(socket);
  console.log(`+ ${name} (online: ${sockets.size})`);

  socket.on('data', (chunk) => {
    for (const other of sockets) {
      if (other !== socket) other.write(`[${name}] ${chunk}`);
    }
  });
  socket.on('error', () => {}); // причину узнаем в 'close'
  socket.on('close', () => {
    sockets.delete(socket);
    console.log(`- ${name} (online: ${sockets.size})`);
  });
});

server.on('error', (error) => {
  console.error(`Cannot listen on port ${port}: ${error.code}`);
  process.exitCode = 1;
});
server.listen(port, () => console.log(`broadcast server on port ${port}`));
