// Упражнение 2: одно событие 'data' — не одно сообщение.
// Сервер печатает каждый пришедший кусок, клиент шлёт три маленьких write
// подряд, а потом одну большую строку.

import { once } from 'node:events';
import net from 'node:net';

const server = net.createServer((socket) => {
  let chunks = 0;
  let bytes = 0;
  socket.on('data', (chunk) => {
    chunks++;
    bytes += chunk.length;
    if (chunk.length < 100) {
      console.log(`data #${chunks}: ${JSON.stringify(chunk.toString())}`);
    }
  });
  socket.on('end', () => {
    console.log(`total: ${bytes} bytes in ${chunks} 'data' events`);
    server.close();
  });
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

const socket = net.connect(server.address().port, '127.0.0.1');
await once(socket, 'connect');

// Три write подряд, без ожидания: скорее всего придут одним куском.
socket.write('{"type":"msg","text":"one"}\n');
socket.write('{"type":"msg","text":"two"}\n');
socket.write('{"type":"msg","text":"three"}\n');

// Даём первым кускам дойти, затем отправляем 1 МБ одной строкой.
await new Promise((resolve) => setTimeout(resolve, 100));
socket.end('x'.repeat(1024 * 1024) + '\n');
