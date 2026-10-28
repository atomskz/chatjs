// Упражнение 4: класс Room с тремя ошибками. Не исправляйте его «на глаз»:
// запустите тесты (node --test room-broken.test.js) и найдите ошибки по их выводу.

export class Room {
  #members = new Map(); // nick → { joinedAt }

  join(nick) {
    this.#members.set(nick, { joinedAt: Date.now() });
  }

  leave(nick) {
    this.#members.delete(nick);
  }

  list() {
    return [...this.#members.keys()].sort();
  }
}
