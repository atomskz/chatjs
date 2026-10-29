// Упражнение 6: порт 0 и адрес прослушивания.

import { once } from 'node:events';
import net from 'node:net';

async function listen(port, host) {
  const server = net.createServer();
  server.listen(port, host);
  await once(server, 'listening');
  return server;
}

for (const host of [undefined, '0.0.0.0', '127.0.0.1']) {
  const server = await listen(0, host); // 0 — «дай любой свободный порт»
  const { address, port } = server.address();
  console.log(`host ${String(host).padEnd(9)} → listening on ${address} port ${port}`);
  server.close();
}
