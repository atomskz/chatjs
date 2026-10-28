// Шаг 1: тесты логики клиента без сети и без терминала.
// Соединение — пара в памяти из лабораторной 5, интерфейс — поддельный:
// он записывает всё, что клиент хотел показать.

import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { describe, test } from 'node:test';
import { ChatClient } from '../../../lib/chat-client.js';
import { TestClient } from '../../../test/helpers.js';
import { ServerMessage } from '../../../protocol.js';
import { createConnectionPair } from '../../05-events/solution/fake-connection.js';

/** Поддельный TerminalUI: тот же интерфейс, но вывод копится в массиве. */
class FakeUI extends EventEmitter {
  printed = [];
  printChat({ from, text, isOwn }) {
    this.printed.push(`chat ${isOwn ? 'you' : from}: ${text}`);
  }
  printSystem(text) {
    this.printed.push(`system ${text}`);
  }
  printInfo(text) {
    this.printed.push(`info ${text}`);
  }
  printError(text) {
    this.printed.push(`error ${text}`);
  }
  close() {}
}

/** Запускает ChatClient; «сервер» в тесте — это TestClient на другом конце провода. */
function startClient(nick = 'ann') {
  const [clientSide, serverSide] = createConnectionPair();
  const ui = new FakeUI();
  const client = new ChatClient({ connection: clientSide, ui, nick });
  const exitCode = client.run();
  return { ui, server: new TestClient(serverSide), exitCode, client };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('ChatClient', () => {
  test('sends join right away and shows the welcome', async () => {
    const { ui, server, client } = startClient('ann');
    assert.deepEqual(await server.next(), { type: 'join', nick: 'ann' });

    server.send(ServerMessage.welcome(['bob', 'ann']));
    await tick();
    assert.ok(ui.printed.includes('info Online (2): bob, ann'), ui.printed.join('\n'));
    client.quit();
  });

  test('sends typed text as msg and marks own messages', async () => {
    const { ui, server, client } = startClient('ann');
    await server.next(); // join
    server.send(ServerMessage.welcome(['ann']));

    ui.emit('line', 'Привет 😀');
    assert.deepEqual(await server.next(), { type: 'msg', text: 'Привет 😀' });
    server.send(ServerMessage.msg('ann', 'Привет 😀'));
    server.send(ServerMessage.msg('bob', 'hi'));
    await tick();
    await tick();
    assert.ok(ui.printed.includes('chat you: Привет 😀'));
    assert.ok(ui.printed.includes('chat bob: hi'));
    client.quit();
  });

  test('handles unknown commands locally', async () => {
    const { ui, server, client } = startClient();
    await server.next(); // join
    ui.emit('line', '/dance');
    assert.match(ui.printed.at(-1), /^error Unknown command \/dance/);
    client.quit();
  });

  test('/quit sends leave and exits with code 0', async () => {
    const { ui, server, exitCode } = startClient();
    await server.next(); // join
    server.send(ServerMessage.welcome(['ann']));
    await tick();

    ui.emit('line', '/quit');
    assert.deepEqual(await server.next(), { type: 'leave' });
    assert.equal(await exitCode, 0);
  });

  test('a join error exits with code 1', async () => {
    const { ui, server, exitCode } = startClient();
    await server.next(); // join
    server.send(ServerMessage.error('NICK_TAKEN', 'Nickname "ann" is already taken'));
    assert.equal(await exitCode, 1);
    assert.ok(ui.printed.some((line) => line.includes('NICK_TAKEN')));
  });

  test('a lost connection exits with code 1', async () => {
    const { ui, server, exitCode } = startClient();
    await server.next(); // join
    server.send(ServerMessage.welcome(['ann']));
    await tick();

    server.close(); // «сервер упал»
    assert.equal(await exitCode, 1);
    assert.equal(ui.printed.at(-1), 'error Connection to server lost');
  });
});
