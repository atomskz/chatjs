// Упражнения 2 и 3: класс с закрытым состоянием и внедрённой зависимостью.

export class RoomError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RoomError';
    this.code = code;
  }
}

export class Room {
  // Закрытые поля (#) недоступны снаружи: состояние меняется только через методы.
  #members = new Map(); // nick → { joinedAt }
  #now;

  /**
   * @param {object} [options]
   * @param {() => number} [options.now] источник времени. Подменяется в тестах.
   */
  constructor({ now = Date.now } = {}) {
    this.#now = now;
  }

  join(nick) {
    if (this.#members.has(nick)) {
      throw new RoomError('NICK_TAKEN', `Nickname "${nick}" is already taken`);
    }
    this.#members.set(nick, { joinedAt: this.#now() });
  }

  leave(nick) {
    return this.#members.delete(nick); // true, если такой участник был
  }

  /** Ники в порядке входа. */
  list() {
    return [...this.#members.keys()];
  }

  joinedAt(nick) {
    return this.#members.get(nick)?.joinedAt ?? null;
  }
}
