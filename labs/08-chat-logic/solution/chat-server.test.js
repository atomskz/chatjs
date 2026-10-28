// Шаг проекта: тесты логики сервера чата без сети.
// Сервер получает «соединение в памяти» из лабораторной 5,
// а TestClient из эталонного test/helpers.js читает ответы по очереди.

import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { ChatServer } from '../../../lib/chat-server.js';
import { TestClient } from '../../../test/helpers.js';
import { createConnectionPair } from '../../05-events/solution/fake-connection.js';

const silentLogger = { info() {}, warn() {}, error() {} };

describe('ChatServer', () => {
  let chat;

  beforeEach(() => {
    chat = new ChatServer({ logger: silentLogger });
  });

  function connect() {
    const [clientSide, serverSide] = createConnectionPair();
    chat.handleConnection(serverSide);
    return new TestClient(clientSide);
  }

  test('welcomes a new user and announces them to others', async () => {
    const ann = connect();
    assert.deepEqual(await ann.join('ann'), { type: 'welcome', users: ['ann'] });

    const bob = connect();
    assert.deepEqual(await bob.join('bob'), { type: 'welcome', users: ['ann', 'bob'] });
    const notice = await ann.next();
    assert.equal(notice.type, 'system');
    assert.equal(notice.text, 'bob joined the chat');
  });

  test('delivers a message to everyone, including the sender', async () => {
    const ann = connect();
    const bob = connect();
    await ann.join('ann');
    await bob.join('bob');
    await ann.next(); // bob joined

    ann.send({ type: 'msg', text: 'hi', from: 'admin' }); // подделанный from
    for (const client of [ann, bob]) {
      const message = await client.next();
      assert.equal(message.from, 'ann');
      assert.equal(message.text, 'hi');
    }
  });

  test('rejects a taken nick and closes the connection', async () => {
    const ann = connect();
    await ann.join('ann');
    const impostor = connect();
    const reply = await impostor.join('ann');
    assert.equal(reply.code, 'NICK_TAKEN');
    await impostor.closed;
  });

  test('requires join before anything else', async () => {
    const client = connect();
    client.send({ type: 'msg', text: 'hi' });
    assert.equal((await client.next()).code, 'NOT_JOINED');
  });

  test('announces leave to the others', async () => {
    const ann = connect();
    const bob = connect();
    await ann.join('ann');
    await bob.join('bob');
    await ann.next(); // bob joined

    bob.send({ type: 'leave' });
    await bob.closed;
    assert.equal((await ann.next()).text, 'bob left the chat');
  });
});
