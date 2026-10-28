// Упражнение 5: клиент WebSocket. Три send подряд — три отдельных сообщения.
// node ws-client.js [url]

import { once } from 'node:events';
import { WebSocket } from 'ws';

const url = process.argv[2] ?? 'ws://localhost:5000';
const socket = new WebSocket(url);

try {
  await once(socket, 'open'); // отклонится, если раньше придёт 'error'
} catch (error) {
  // Для localhost приходит AggregateError с пустым message: код ищем внутри.
  const code = error.code ?? error.errors?.[0]?.code;
  console.error(`Cannot connect to ${url}: ${code ?? error.message}`);
  process.exitCode = 1;
}

if (socket.readyState === WebSocket.OPEN) {
  let received = 0;
  socket.on('message', (data) => {
    received++;
    console.log(`message #${received}: ${data}`);
    if (received === 3) {
      socket.close(1000, 'bye'); // 1000 — нормальное закрытие
    }
  });
  socket.on('close', (code) => console.log(`closed with code ${code}`));

  socket.send('one');
  socket.send('two');
  socket.send('Привет 😀');
}
