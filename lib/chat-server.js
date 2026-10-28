// Логика сервера чата: разбирает сообщения протокола и рассылает их.
// Работает с абстрактными соединениями из слоя транспорта (см. transport/index.js)
// и не знает, что под ними WebSocket.

import { ErrorCode, ServerMessage, decode, encode } from '../protocol.js';

const CLIENT_MESSAGE_TYPES = ['msg'];

export class ChatServer {
  /** Все подключённые клиенты. Рассылку делаем сами — проходим по этому списку. */
  #connections = new Set();
  #logger;

  constructor({ logger = console } = {}) {
    this.#logger = logger;
  }

  /** Подключает новое соединение к чату. Вызывается транспортом. */
  handleConnection(connection) {
    this.#connections.add(connection);
    this.#logger.info(`Connected: ${connection.remoteAddress}`);

    connection.on('message', (text) => this.#handleMessage(connection, text));
    connection.on('close', (error) => this.#handleDisconnect(connection, error));
  }

  #handleMessage(connection, text) {
    let message;
    try {
      message = decode(text);
    } catch (error) {
      // Мусор от клиента не роняет сервер: отвечаем ошибкой и ждём дальше.
      this.#sendError(connection, error.code, error.message);
      return;
    }

    if (!CLIENT_MESSAGE_TYPES.includes(message.type)) {
      this.#sendError(connection, ErrorCode.UNKNOWN_TYPE, `Unknown message type "${message.type}"`);
      return;
    }

    switch (message.type) {
      case 'msg':
        // Ников пока нет, поэтому отправителя обозначаем его адресом.
        // Время ставит сервер: клиенту доверять нельзя.
        this.#broadcast(ServerMessage.msg(connection.remoteAddress, message.text));
        break;
    }
  }

  #handleDisconnect(connection, error) {
    this.#connections.delete(connection);
    const reason = error ? `: ${error.message}` : '';
    this.#logger.info(`Disconnected: ${connection.remoteAddress}${reason}`);
  }

  /** Рассылает сообщение всем подключённым. */
  #broadcast(message) {
    const text = encode(message); // кодируем один раз, а не для каждого получателя
    for (const connection of this.#connections) {
      connection.send(text);
    }
  }

  #send(connection, message) {
    connection.send(encode(message));
  }

  #sendError(connection, code, text) {
    this.#logger.warn(`Error ${code} for ${connection.remoteAddress}: ${text}`);
    this.#send(connection, ServerMessage.error(code, text));
  }
}
