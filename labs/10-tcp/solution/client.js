// Упражнения 2 и 4: TCP-клиент. Отправляет строку и печатает ответ.
// node client.js <host> <port> <text>

import { once } from 'node:events';
import net from 'node:net';

const [host = '127.0.0.1', port = '5000', text = 'hello'] = process.argv.slice(2);

function describeConnectError(error) {
  // Для localhost Node.js пробует и IPv4, и IPv6, и ошибки приходят в AggregateError.
  const code = error.code ?? error.errors?.[0]?.code;
  switch (code) {
    case 'ECONNREFUSED':
      return 'connection refused: nobody listens on this host and port';
    case 'ENOTFOUND':
      return 'host not found';
    case 'ETIMEDOUT':
      return 'connection timed out';
    default:
      return error.message;
  }
}

const socket = net.connect({ host, port: Number(port), timeout: 3000 });
socket.once('timeout', () => {
  socket.destroy(Object.assign(new Error('Connection timed out'), { code: 'ETIMEDOUT' }));
});

try {
  await once(socket, 'connect');
} catch (error) {
  console.error(`Cannot connect to ${host}:${port}: ${describeConnectError(error)}`);
  process.exitCode = 1;
}

if (!process.exitCode) {
  socket.setTimeout(0); // соединение есть, дальше оно может молчать сколько угодно
  console.log(`connected from ${socket.localAddress}:${socket.localPort}`);
  socket.on('data', (chunk) => process.stdout.write(`server says: ${chunk}`));
  socket.on('error', (error) => console.error(`error: ${error.message}`));
  socket.on('close', () => console.log('connection closed'));
  socket.end(`${text}\n`); // отправить и сказать «больше писать не буду» (FIN)
}
