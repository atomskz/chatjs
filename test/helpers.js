// Общие помощники для тестов.

import { on, once } from 'node:events';
import { ChatServer } from '../lib/chat-server.js';
import { decode, encode } from '../protocol.js';

const silentLogger = { info() {}, warn() {}, error() {} };

/** Поднимает сервер чата на случайном свободном порту (port: 0). */
export async function startChatServer(transport) {
  const chat = new ChatServer({ logger: silentLogger });
  const server = await transport.listen({
    port: 0,
    onConnection: (connection) => chat.handleConnection(connection),
  });
  return {
    chat,
    port: server.port,
    stop: async () => {
      chat.shutdown();
      await server.close();
    },
  };
}

/** Программный клиент: отправляет сообщения и по очереди отдаёт полученные. */
export class TestClient {
  #connection;
  #messages;

  constructor(connection) {
    this.#connection = connection;
    // events.on() складывает события в очередь, поэтому сообщения не теряются,
    // даже если пришли раньше, чем тест вызвал next().
    // Очередь заканчивается, когда соединение закрыто.
    this.#messages = on(connection, 'message', { close: ['close'] });
    this.closed = once(connection, 'close');
  }

  send(message) {
    this.#connection.send(encode(message));
  }

  sendRaw(text) {
    this.#connection.send(text);
  }

  /** Следующее полученное сообщение. */
  async next() {
    const { value, done } = await this.#messages.next();
    if (done) {
      throw new Error('Connection closed before a message arrived');
    }
    const [text] = value; // аргументы события 'message'
    return decode(text);
  }

  async join(nick) {
    this.send({ type: 'join', nick });
    return this.next();
  }

  close() {
    this.#connection.close();
    return this.closed;
  }
}
