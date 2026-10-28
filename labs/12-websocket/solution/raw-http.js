// Упражнение 2: HTTP — это просто текст поверх TCP.
// node raw-http.js [port] — отправляет запрос руками через net и печатает ответ как есть.

import net from 'node:net';

const port = Number(process.argv[2] ?? 5000);
const socket = net.connect(port, '127.0.0.1');

socket.on('connect', () => {
  // Строки HTTP завершаются \r\n, пустая строка — конец заголовков.
  socket.write('GET /time HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n');
});
socket.on('data', (chunk) => process.stdout.write(chunk));
socket.on('error', (error) => console.error(error.message));
socket.on('end', () => console.log('\n--- server closed the connection'));
