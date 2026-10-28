// Логика клиента чата: вход и реакция на сообщения сервера.
// Связывает соединение из слоя транспорта с интерфейсом терминала,
// но не знает ни про WebSocket, ни про readline.

import { ClientMessage, decode, encode } from '../protocol.js';

export class ChatClient {
  #connection;
  #ui;
  #nick;

  constructor({ connection, ui, nick }) {
    this.#connection = connection;
    this.#ui = ui;
    this.#nick = nick;
  }

  /** Запускает клиент. Промис завершается, когда соединение закрыто. */
  run() {
    return new Promise((resolve) => {
      this.#connection.on('message', (text) => this.#handleServerText(text));
      this.#connection.on('close', () => {
        this.#ui.close();
        resolve();
      });
      this.#ui.on('line', (line) => this.#handleInput(line));
      this.#ui.on('quit', () => this.quit());

      this.#send(ClientMessage.join(this.#nick));
    });
  }

  quit() {
    this.#send(ClientMessage.leave());
    this.#connection.close();
  }

  #handleInput(line) {
    if (line.trim() === '') return;
    this.#send(ClientMessage.msg(line));
  }

  #handleServerText(text) {
    let message;
    try {
      message = decode(text);
    } catch {
      this.#ui.printError('Received a malformed message from the server');
      return;
    }

    switch (message.type) {
      case 'welcome':
        this.#ui.printSystem(`Welcome, ${this.#nick}!`);
        this.#ui.printInfo(`Online (${message.users.length}): ${message.users.join(', ')}`);
        break;
      case 'error':
        this.#ui.printError(`${message.message} (${message.code})`);
        break;
      case 'msg':
        this.#ui.printChat({ ...message, isOwn: message.from === this.#nick });
        break;
      case 'system':
        this.#ui.printSystem(message.text, message.ts);
        break;
      default:
      // Неизвестные типы молча пропускаем: так старый клиент
      // не сломается, если в новой версии сервера появятся новые сообщения.
    }
  }

  #send(message) {
    this.#connection.send(encode(message));
  }
}
