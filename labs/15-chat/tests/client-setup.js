// Общая подготовка для тестов ChatClient: соединение в памяти и поддельный интерфейс.
// «Сервер» в тестах — это TestClient на другом конце провода: тест сам читает,
// что прислал клиент, и сам отвечает ему серверными сообщениями.

import { EventEmitter } from 'node:events';
import { ChatClient } from '../lib/chat-client.js';
import { createConnectionPair } from './fake-connection.js';
import { TestClient } from './helpers.js';

/**
 * Поддельный TerminalUI: те же методы и события, но вместо терминала
 * всё, что клиент хотел показать, складывается в массив printed.
 * Ввод пользователя тест имитирует так: ui.emit('line', 'текст'), ui.emit('quit').
 */
export class FakeUI extends EventEmitter {
  printed = [];
  isClosed = false;

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
  close() {
    this.isClosed = true;
  }
}

/** Запускает ChatClient и возвращает всё, что нужно тесту. */
export function startClient(nick = 'ann') {
  const [clientSide, serverSide] = createConnectionPair();
  const ui = new FakeUI();
  const client = new ChatClient({ connection: clientSide, ui, nick });
  const exitCode = client.run(); // промис, выполнится при закрытии соединения
  return { client, ui, server: new TestClient(serverSide), exitCode };
}

/** Даёт сообщениям в памяти дойти до получателя. */
export function tick() {
  return new Promise((resolve) => setImmediate(resolve));
}
