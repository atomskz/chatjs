// Упражнение 1: TCP эхо-сервер на модуле net.
// node echo-server.js [port] [host]
// Проверка: node client.js 127.0.0.1 5000 hello  (или nc localhost 5000)

import { once } from 'node:events';
import net from 'node:net';

const port = Number(process.argv[2] ?? 5000);
const host = process.argv[3]; // не указан — слушаем все интерфейсы

const server = net.createServer((socket) => {
  const address = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`connected: ${address}`);

  socket.on('data', (chunk) => {
    socket.write(`echo: ${chunk}`); // chunk — Buffer, в шаблонной строке станет текстом
  });
  socket.on('end', () => {
    console.log(`end from ${address}: the client will not send anything else`);
    socket.end(); // закрываем и свою сторону
  });
  // Без обработчика 'error' обрыв связи (ECONNRESET) уронит весь сервер.
  socket.on('error', (error) => console.log(`error on ${address}: ${error.code}`));
  socket.on('close', (hadError) => console.log(`closed: ${address}, hadError=${hadError}`));
});

server.listen(port, host);
try {
  await once(server, 'listening'); // отклонится, если раньше придёт 'error'
} catch (error) {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  } else {
    console.error(`Cannot listen: ${error.message}`);
  }
  process.exitCode = 1;
  // server.listen не удался, держать процесс больше нечему — он завершится сам.
}

if (server.listening) {
  const { address, family, port: actualPort } = server.address();
  console.log(`listening on ${address}:${actualPort} (${family})`);
}
