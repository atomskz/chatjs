// Логика сервера чата: участники, регистрация, рассылка, команды.
// Работает с абстрактными соединениями из слоя транспорта (см. transport/index.js)
// и не знает, WebSocket под ними или TCP.

import {
  ErrorCode,
  NICK_RULES,
  ServerMessage,
  decode,
  encode,
  isValidNick,
  validateText,
} from '../protocol.js';

const CLIENT_MESSAGE_TYPES = ['join', 'msg', 'list', 'leave'];

export class ChatServer {
  /**
   * Все подключённые клиенты, включая ещё не приславших join.
   * Ключ — соединение, значение — состояние клиента (nick === null до регистрации).
   * Map сохраняет порядок добавления, поэтому список участников идёт в порядке входа.
   */
  #clients = new Map();
  #logger;
  #isShuttingDown = false;

  constructor({ logger = console } = {}) {
    this.#logger = logger;
  }

  /** Подключает новое соединение к чату. Вызывается транспортом. */
  handleConnection(connection) {
    this.#clients.set(connection, { nick: null });
    this.#logger.info(`Connected: ${connection.remoteAddress}`);

    connection.on('message', (text) => {
      // Граница ошибок: баг при обработке одного сообщения
      // не должен ронять сервер и задевать других клиентов.
      try {
        this.#handleMessage(connection, text);
      } catch (error) {
        this.#logger.error(
          `Failed to handle message from ${connection.remoteAddress}: ${error.stack}`,
        );
        this.#sendError(connection, ErrorCode.INTERNAL_ERROR, 'Internal server error');
      }
    });
    connection.on('close', (error) => this.#handleDisconnect(connection, error));
  }

  /** Предупреждает всех о выключении и закрывает соединения. */
  shutdown() {
    this.#isShuttingDown = true;
    this.#broadcast(ServerMessage.system('Server is shutting down'));
    for (const connection of this.#clients.keys()) {
      connection.close();
    }
  }

  #handleMessage(connection, text) {
    const client = this.#clients.get(connection);
    if (!client) {
      return; // сообщение пришло, пока соединение закрывалось
    }

    let message;
    try {
      message = decode(text);
    } catch (error) {
      this.#sendError(connection, error.code, error.message);
      return;
    }

    if (!CLIENT_MESSAGE_TYPES.includes(message.type)) {
      this.#sendError(connection, ErrorCode.UNKNOWN_TYPE, `Unknown message type "${message.type}"`);
      return;
    }
    if (client.nick === null && message.type !== 'join') {
      this.#sendError(connection, ErrorCode.NOT_JOINED, 'Send "join" first');
      return;
    }

    switch (message.type) {
      case 'join':
        this.#handleJoin(connection, client, message);
        break;
      case 'msg':
        this.#handleChatMessage(connection, client, message);
        break;
      case 'list':
        this.#send(connection, ServerMessage.users(this.#getNicks()));
        break;
      case 'leave':
        // Остальное (удаление из списка, «left the chat») сделает #handleDisconnect,
        // чтобы штатный выход и обрыв связи обрабатывались одним кодом.
        connection.close();
        break;
    }
  }

  #handleJoin(connection, client, { nick }) {
    if (client.nick !== null) {
      this.#sendError(
        connection,
        ErrorCode.ALREADY_JOINED,
        `You have already joined as "${client.nick}"`,
      );
      return;
    }
    if (!isValidNick(nick)) {
      this.#rejectJoin(
        connection,
        ErrorCode.INVALID_NICK,
        `Invalid nickname. Allowed: ${NICK_RULES}`,
      );
      return;
    }
    if (this.#getNicks().includes(nick)) {
      this.#rejectJoin(connection, ErrorCode.NICK_TAKEN, `Nickname "${nick}" is already taken`);
      return;
    }

    client.nick = nick;
    this.#logger.info(`Joined: ${nick} (${connection.remoteAddress})`);
    this.#send(connection, ServerMessage.welcome(this.#getNicks()));
    this.#broadcast(ServerMessage.system(`${nick} joined the chat`), { except: connection });
  }

  #rejectJoin(connection, code, text) {
    this.#sendError(connection, code, text);
    connection.close();
  }

  #handleChatMessage(connection, client, { text }) {
    const problem = validateText(text);
    if (problem) {
      this.#sendError(connection, ErrorCode.INVALID_TEXT, problem);
      return;
    }
    // Отправителя и время ставит сервер: клиенту доверять нельзя,
    // иначе любой мог бы писать от чужого имени или подделать время.
    this.#broadcast(ServerMessage.msg(client.nick, text));
  }

  #handleDisconnect(connection, error) {
    const client = this.#clients.get(connection);
    this.#clients.delete(connection);

    const who = client?.nick
      ? `${client.nick} (${connection.remoteAddress})`
      : connection.remoteAddress;
    const reason = error ? `: ${error.message}` : '';
    this.#logger.info(`Disconnected: ${who}${reason}`);

    if (client?.nick && !this.#isShuttingDown) {
      this.#broadcast(ServerMessage.system(`${client.nick} left the chat`));
    }
  }

  /** Ники зарегистрированных участников в порядке входа. */
  #getNicks() {
    const nicks = [];
    for (const client of this.#clients.values()) {
      if (client.nick !== null) nicks.push(client.nick);
    }
    return nicks;
  }

  /** Рассылает сообщение всем зарегистрированным участникам. */
  #broadcast(message, { except } = {}) {
    const text = encode(message); // кодируем один раз, а не для каждого получателя
    for (const [connection, client] of this.#clients) {
      if (client.nick !== null && connection !== except) {
        connection.send(text);
      }
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
