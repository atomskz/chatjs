// Шаг проекта: пара соединений в памяти, без сети.
// Что отправили в одно соединение, приходит событием 'message' в другое.
// Интерфейс тот же, что у настоящего транспорта (лабораторная 13):
//   remoteAddress, send(text), close(), события 'message' (text) и 'close'.
// С ней логику чата можно писать и тестировать до того, как появится сеть.

import { EventEmitter } from 'node:events';

class FakeConnection extends EventEmitter {
  peer = null;
  isClosed = false;

  constructor(remoteAddress) {
    super();
    this.remoteAddress = remoteAddress;
  }

  send(text) {
    if (this.isClosed) return;
    const peer = this.peer;
    // Доставляем асинхронно, как настоящая сеть: получатель узнает
    // о сообщении в следующем витке цикла событий, а не внутри send().
    setImmediate(() => peer.emit('message', text));
  }

  close() {
    if (this.isClosed) return;
    for (const side of [this, this.peer]) {
      side.isClosed = true;
      // setImmediate сохраняет порядок: отправленное до close() придёт раньше 'close'.
      setImmediate(() => side.emit('close'));
    }
  }
}

/** Возвращает [clientSide, serverSide] — два конца одного «провода». */
export function createConnectionPair() {
  const client = new FakeConnection('server');
  const server = new FakeConnection('fake-client');
  client.peer = server;
  server.peer = client;
  return [client, server];
}
