// Логика клиента чата: вход, команды, реакция на сообщения сервера.
// Связывает соединение из слоя транспорта с интерфейсом терминала,
// но не знает ни про WebSocket, ни про readline.

import { ClientMessage, decode, encode, validateText } from '../protocol.js';

const HELP = [
  'Commands:',
  '  /users  show online users',
  '  /quit   leave the chat (same as Ctrl+C)',
  '  /help   show this help',
].join('\n');

/**
 * Состояния клиента:
 *   joining — отправили join, ждём welcome
 *   joined  — в чате
 *   leaving — пользователь выходит сам
 *   failed  — сервер отклонил вход
 */
export class ChatClient {
  #connection;
  #ui;
  #nick;
  #state = 'joining';

  constructor({ connection, ui, nick }) {
    this.#connection = connection;
    this.#ui = ui;
    this.#nick = nick;
  }

  /**
   * Запускает клиент. Промис завершается, когда соединение закрыто,
   * и возвращает код выхода процесса: 0 — штатный выход, 1 — ошибка.
   * @returns {Promise<number>}
   */
  run() {
    return new Promise((resolve) => {
      this.#connection.on('message', (text) => this.#handleServerText(text));
      this.#connection.on('close', () => {
        const exitCode = this.#exitCodeOnClose();
        this.#ui.close();
        resolve(exitCode);
      });
      this.#ui.on('line', (line) => this.#handleInput(line));
      this.#ui.on('quit', () => this.quit());

      this.#send(ClientMessage.join(this.#nick));
    });
  }

  quit() {
    if (this.#state === 'leaving' || this.#state === 'failed') return;
    this.#state = 'leaving';
    this.#send(ClientMessage.leave());
    this.#connection.close();
  }

  #exitCodeOnClose() {
    switch (this.#state) {
      case 'leaving':
        this.#ui.printInfo('Bye!');
        return 0;
      case 'failed':
        return 1;
      default:
        this.#ui.printError('Connection to server lost');
        return 1;
    }
  }

  #handleInput(line) {
    const text = line.trim();
    if (text === '') return;

    if (text.startsWith('/')) {
      this.#runCommand(text);
      return;
    }

    // Та же проверка, что и на сервере (общий protocol.js): не гоняем по сети
    // заведомо неверное сообщение. Но сервер всё равно проверяет сам.
    const problem = validateText(line);
    if (problem) {
      this.#ui.printError(problem);
      return;
    }
    this.#send(ClientMessage.msg(line));
  }

  #runCommand(input) {
    const [command] = input.split(/\s+/);
    switch (command) {
      case '/users':
        this.#send(ClientMessage.list());
        break;
      case '/quit':
        this.quit();
        break;
      case '/help':
        this.#ui.printInfo(HELP);
        break;
      default:
        this.#ui.printError(`Unknown command ${command}. Type /help for the list of commands`);
    }
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
        // Пользователь мог выйти, не дождавшись welcome: тогда остаёмся в leaving,
        // иначе закрытие соединения ошибочно сочтётся обрывом.
        if (this.#state !== 'joining') return;
        this.#state = 'joined';
        this.#ui.printSystem(`Welcome, ${this.#nick}! Type /help for commands`);
        this.#printUsers(message.users);
        break;
      case 'error':
        this.#handleError(message);
        break;
      case 'msg':
        this.#ui.printChat({ ...message, isOwn: message.from === this.#nick });
        break;
      case 'system':
        this.#ui.printSystem(message.text, message.ts);
        break;
      case 'users':
        this.#printUsers(message.users);
        break;
      default:
      // Неизвестные типы молча пропускаем: так старый клиент
      // не сломается, если в новой версии сервера появятся новые сообщения.
    }
  }

  #handleError({ code, message }) {
    if (this.#state === 'joining') {
      // Ошибка входа (ник занят или невалиден) — дальше работать нельзя.
      this.#state = 'failed';
      this.#ui.printError(`Cannot join: ${message} (${code})`);
      this.#connection.close();
      return;
    }
    this.#ui.printError(message);
  }

  #printUsers(users) {
    this.#ui.printInfo(`Online (${users.length}): ${users.join(', ')}`);
  }

  #send(message) {
    this.#connection.send(encode(message));
  }
}
