// Логика сервера чата. Пока она умеет одно: рассылать полученный текст
// всем подключённым. Работает с абстрактными соединениями из слоя транспорта
// (см. transport/index.js) и не знает, что под ними WebSocket.

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

    connection.on('message', (text) => this.#broadcast(text));
    connection.on('close', (error) => {
      this.#connections.delete(connection);
      const reason = error ? `: ${error.message}` : '';
      this.#logger.info(`Disconnected: ${connection.remoteAddress}${reason}`);
    });
  }

  #broadcast(text) {
    for (const connection of this.#connections) {
      connection.send(text);
    }
  }
}
