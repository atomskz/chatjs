// Интеграционные тесты: поднимаем настоящий сервер на случайном порту,
// подключаем клиентов программно и проверяем протокол.

import assert from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import { ClientMessage, ErrorCode, MAX_TEXT_LENGTH } from '../protocol.js';
import * as transport from '../transport/index.js';
import { TestClient, startChatServer } from './helpers.js';

describe('chat', () => {
  let server;
  let openClients = [];

  const connectClient = async () => {
    const connection = await transport.connect({ host: '127.0.0.1', port: server.port });
    const client = new TestClient(connection);
    openClients.push(client);
    return client;
  };

  before(async () => {
    server = await startChatServer(transport);
  });

  // Дожидаемся закрытия всех клиентов, чтобы их «left the chat»
  // не прилетело участникам следующего теста.
  afterEach(async () => {
    await Promise.all(openClients.map((client) => client.close()));
    openClients = [];
  });

  after(() => server.stop());

  it('welcomes a new user and announces them to others', async () => {
    const alice = await connectClient();
    assert.deepEqual(await alice.join('alice'), { type: 'welcome', users: ['alice'] });

    const bob = await connectClient();
    assert.deepEqual(await bob.join('bob'), { type: 'welcome', users: ['alice', 'bob'] });

    const notice = await alice.next();
    assert.equal(notice.type, 'system');
    assert.equal(notice.text, 'bob joined the chat');
  });

  it('delivers a message to everyone, including the sender', async () => {
    const alice = await connectClient();
    const bob = await connectClient();
    await alice.join('alice');
    await bob.join('bob');
    await alice.next(); // «bob joined the chat»

    // Сервер должен проигнорировать подделанные from и ts.
    alice.send({ type: 'msg', text: 'Привет всем! 👋', from: 'mallory', ts: 0 });

    for (const client of [alice, bob]) {
      const message = await client.next();
      assert.equal(message.type, 'msg');
      assert.equal(message.from, 'alice');
      assert.equal(message.text, 'Привет всем! 👋');
      assert.ok(message.ts > 0);
    }
  });

  it('rejects a taken nickname and closes the connection', async () => {
    const first = await connectClient();
    await first.join('alice');

    const second = await connectClient();
    const error = await second.join('alice');
    assert.equal(error.type, 'error');
    assert.equal(error.code, ErrorCode.NICK_TAKEN);
    await second.closed;
  });

  it('rejects an invalid nickname and closes the connection', async () => {
    const client = await connectClient();
    const error = await client.join('no spaces allowed');
    assert.equal(error.code, ErrorCode.INVALID_NICK);
    await client.closed;
  });

  it('answers garbage with errors and keeps working', async () => {
    const client = await connectClient();

    client.sendRaw('this is not json');
    assert.equal((await client.next()).code, ErrorCode.BAD_MESSAGE);

    client.sendRaw('{"text":"no type"}');
    assert.equal((await client.next()).code, ErrorCode.BAD_MESSAGE);

    client.send({ type: 'dance' });
    assert.equal((await client.next()).code, ErrorCode.UNKNOWN_TYPE);

    client.send(ClientMessage.msg('too early'));
    assert.equal((await client.next()).code, ErrorCode.NOT_JOINED);

    // После всего этого клиент всё ещё может войти.
    assert.equal((await client.join('survivor')).type, 'welcome');
  });

  it('rejects empty and too long messages', async () => {
    const client = await connectClient();
    await client.join('alice');

    client.send(ClientMessage.msg('   '));
    assert.equal((await client.next()).code, ErrorCode.INVALID_TEXT);

    client.send(ClientMessage.msg('x'.repeat(MAX_TEXT_LENGTH + 1)));
    assert.equal((await client.next()).code, ErrorCode.INVALID_TEXT);
  });

  it('returns the user list on "list"', async () => {
    const alice = await connectClient();
    const bob = await connectClient();
    await alice.join('alice');
    await bob.join('bob');

    bob.send(ClientMessage.list());
    assert.deepEqual(await bob.next(), { type: 'users', users: ['alice', 'bob'] });
  });

  it('announces a user who disconnected without "leave"', async () => {
    const alice = await connectClient();
    const bob = await connectClient();
    await alice.join('alice');
    await bob.join('bob');
    await alice.next(); // «bob joined the chat»

    await bob.close(); // как будто закрыли терминал

    const notice = await alice.next();
    assert.equal(notice.text, 'bob left the chat');
  });
});

it('warns everyone and closes connections on shutdown', async () => {
  const server = await startChatServer(transport);
  const alice = new TestClient(await transport.connect({ host: '127.0.0.1', port: server.port }));
  await alice.join('alice');

  const stopped = server.stop();
  assert.equal((await alice.next()).text, 'Server is shutting down');
  await alice.closed;
  await stopped;
});
