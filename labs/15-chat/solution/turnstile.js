// Упражнение 1: конечный автомат турникета с состоянием «сломан».
// Каждый метод — событие; что он делает, зависит от текущего состояния.

export class Turnstile {
  #state = 'locked';

  get state() {
    return this.#state;
  }

  coin() {
    switch (this.#state) {
      case 'locked':
        this.#state = 'unlocked';
        return 'unlocked, come in';
      case 'unlocked':
        return 'already unlocked, coin returned';
      case 'broken':
        return 'out of order, coin returned';
    }
  }

  push() {
    switch (this.#state) {
      case 'locked':
        return 'locked, insert a coin';
      case 'unlocked':
        this.#state = 'locked';
        return 'passed, locked again';
      case 'broken':
        return 'out of order';
    }
  }

  // Сломаться можно в любом состоянии, поэтому switch не нужен.
  breakDown() {
    this.#state = 'broken';
    return 'broken';
  }

  repair() {
    if (this.#state !== 'broken') return 'nothing to repair';
    this.#state = 'locked';
    return 'repaired, locked';
  }
}
