// Упражнение 5: тесты контракта транспорта (см. transport/index.js эталона).
// Тесты ничего не знают о ws и net и проходят на любой реализации контракта.

import assert from 'node:assert/strict';
import { EventEmitter, on, once } from 'node:events';
import { describe, test } from 'node:test';
import { TRANSPORT_NAMES, getTransport } from '../../../transport/index.js';

/** Сервер, который отдаёт свои соединения тесту через асинхронный итератор. */
async function startServer(transport) {
  const connections = new EventEmitter();
  const server = await transport.listen({
    port: 0,
    onConnection: (connection) => connections.emit('connection', connection),
  });
  const accepted = on(connections, 'connection');
  return {
    port: server.port,
    server,
    nextConnection: async () => (await accepted.next()).value[0],
  };
}

for (const name of TRANSPORT_NAMES) {
  const transport = getTransport(name);

  describe(`${name} transport`, () => {
    test('delivers messages both ways, with Unicode', async () => {
      const { port, server, nextConnection } = await startServer(transport);
      const client = await transport.connect({ host: '127.0.0.1', port });
      const serverSide = await nextConnection();

      client.send('Привет 😀');
      assert.deepEqual(await once(serverSide, 'message'), ['Привет 😀']);
      serverSide.send('pong');
      assert.deepEqual(await once(client, 'message'), ['pong']);

      client.close();
      await server.close();
    });

    test('keeps message boundaries for quick sends', async () => {
      const { port, server, nextConnection } = await startServer(transport);
      const client = await transport.connect({ host: '127.0.0.1', port });
      const serverSide = await nextConnection();

      const received = [];
      serverSide.on('message', (text) => received.push(text));
      client.send('{"n":1}');
      client.send('{"n":2}');
      client.send('{"n":3}');
      client.close();
      await once(serverSide, 'close');
      assert.deepEqual(received, ['{"n":1}', '{"n":2}', '{"n":3}']);

      await server.close();
    });

    test('closing one side emits close on the other', async () => {
      const { port, server, nextConnection } = await startServer(transport);
      const client = await transport.connect({ host: '127.0.0.1', port });
      const serverSide = await nextConnection();

      serverSide.close();
      await once(client, 'close');

      await server.close();
    });

    test('connect rejects when nobody listens', async () => {
      const { port, server } = await startServer(transport);
      await server.close(); // порт только что освободился — там никого нет
      await assert.rejects(transport.connect({ host: '127.0.0.1', port }), {
        code: 'ECONNREFUSED',
      });
    });

    test('listen rejects on a busy port', async () => {
      const { port, server } = await startServer(transport);
      await assert.rejects(transport.listen({ port, onConnection() {} }), {
        code: 'EADDRINUSE',
      });
      await server.close();
    });
  });
}
