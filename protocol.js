// Прикладной протокол чата: формат сообщений и правила их проверки.
// Этот модуль общий для сервера и клиента и ничего не знает о сети:
// он превращает объекты в строки и обратно, а доставка строк — забота транспорта.

export const MAX_TEXT_LENGTH = 1000;

const NICK_PATTERN = /^[A-Za-z0-9_-]{1,20}$/;
export const NICK_RULES = '1-20 characters: latin letters, digits, "_" or "-"';

/** Коды ошибок, которые сервер отправляет в сообщении `error`. */
export const ErrorCode = {
  BAD_MESSAGE: 'BAD_MESSAGE', // не JSON или нет поля type
  UNKNOWN_TYPE: 'UNKNOWN_TYPE',
  NOT_JOINED: 'NOT_JOINED', // сообщение до join
  ALREADY_JOINED: 'ALREADY_JOINED',
  INVALID_NICK: 'INVALID_NICK',
  NICK_TAKEN: 'NICK_TAKEN',
  INVALID_TEXT: 'INVALID_TEXT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

/** Ошибка разбора входящего сообщения. */
export class ProtocolError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProtocolError';
    this.code = code;
  }
}

// Конструкторы сообщений. Благодаря им формат каждого сообщения описан
// ровно в одном месте, а не собирается вручную по всему коду.

/** Сообщения клиент → сервер. */
export const ClientMessage = {
  join: (nick) => ({ type: 'join', nick }),
  msg: (text) => ({ type: 'msg', text }),
  list: () => ({ type: 'list' }),
  leave: () => ({ type: 'leave' }),
};

/** Сообщения сервер → клиент. */
export const ServerMessage = {
  welcome: (users) => ({ type: 'welcome', users }),
  error: (code, message) => ({ type: 'error', code, message }),
  msg: (from, text, ts = Date.now()) => ({ type: 'msg', from, text, ts }),
  system: (text, ts = Date.now()) => ({ type: 'system', text, ts }),
  users: (users) => ({ type: 'users', users }),
};

/** Объект сообщения → строка для отправки. */
export function encode(message) {
  return JSON.stringify(message);
}

/**
 * Строка из сети → объект сообщения.
 * Проверяет только общую форму (JSON-объект с полем `type`),
 * поля конкретных типов проверяет тот, кто сообщение обрабатывает.
 * @throws {ProtocolError}
 */
export function decode(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ProtocolError(ErrorCode.BAD_MESSAGE, 'Message is not valid JSON');
  }

  const isObject = typeof data === 'object' && data !== null && !Array.isArray(data);
  if (!isObject || typeof data.type !== 'string') {
    throw new ProtocolError(
      ErrorCode.BAD_MESSAGE,
      'Message must be a JSON object with a string "type" field',
    );
  }
  return data;
}

export function isValidNick(nick) {
  return typeof nick === 'string' && NICK_PATTERN.test(nick);
}

/**
 * Проверяет текст сообщения чата.
 * @returns {string | null} описание проблемы или null, если текст корректен
 */
export function validateText(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return 'Message must not be empty';
  }
  // Считаем символы (code points), а не UTF-16 единицы:
  // у `'😀'.length` значение 2, а у `[...'😀'].length` — 1.
  if ([...text].length > MAX_TEXT_LENGTH) {
    return `Message is longer than ${MAX_TEXT_LENGTH} characters`;
  }
  return null;
}
