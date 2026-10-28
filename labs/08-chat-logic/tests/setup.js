// Общая подготовка для тестов ChatServer: сервер с тихим логгером
// и функция, которая подключает к нему нового клиента через соединение в памяти.

import { ChatServer } from '../lib/chat-server.js';
import { createConnectionPair } from './fake-connection.js';
import { TestClient } from './helpers.js';

export const silentLogger = { info() {}, warn() {}, error() {} };

export function createChat(logger = silentLogger) {
  const chat = new ChatServer({ logger });
  const connect = () => {
    const [clientSide, serverSide] = createConnectionPair();
    chat.handleConnection(serverSide);
    return new TestClient(clientSide);
  };
  return { chat, connect };
}
