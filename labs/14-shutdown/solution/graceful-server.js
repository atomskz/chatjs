// Упражнение 3: аккуратное выключение TCP-сервера по Ctrl+C или SIGTERM.
// node graceful-server.js, подключите пару клиентов (nc localhost 5000), нажмите Ctrl+C.

import { once } from 'node:events';
import net from 'node:net';

const port = Number(process.argv[2] ?? 5000);
const CLOSE_TIMEOUT_MS = 2000;
const sockets = new Set();

const server = net.createServer((socket) => {
  sockets.add(socket);
  socket.write('Welcome! Type something.\n');
  socket.on('data', (chunk) => socket.write(`echo: ${chunk}`));
  socket.on('error', () => {});
  socket.on('close', () => sockets.delete(socket));
});

server.listen(port);
await once(server, 'listening');
console.log(`listening on port ${port}, press Ctrl+C to stop`);

async function stop(signal) {
  console.log(`${signal} received, shutting down...`);

  // 1. Перестать принимать новые подключения. Промис выполнится,
  //    когда закроется последнее из уже открытых соединений.
  const closed = new Promise((resolve) => server.close(resolve));

  // 2. Предупредить клиентов и штатно закрыть соединения.
  for (const socket of sockets) {
    socket.end('Server is shutting down\n');
    // 3. Страховка: тех, кто не закрыл свою сторону, отключаем принудительно.
    //    unref — чтобы этот таймер сам по себе не держал процесс.
    setTimeout(() => socket.destroy(), CLOSE_TIMEOUT_MS).unref();
  }

  await closed;
  console.log('Server stopped');
  // process.exit не нужен: держать процесс больше нечему, он завершится сам.
}

process.once('SIGINT', stop); // Ctrl+C
process.once('SIGTERM', stop); // kill, systemd, docker stop
