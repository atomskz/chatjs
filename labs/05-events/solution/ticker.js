// Упражнение 1: свой класс-источник событий.
//
// События:
//   'tick' (n)  — очередной тик, n начинается с 1
//   'done'      — все тики выполнены
//   'error' (e) — тик номер failAt не удался (для упражнения 4)

import { EventEmitter } from 'node:events';

export class Ticker extends EventEmitter {
  #timer = null;

  start({ intervalMs = 100, count = 3, failAt = null } = {}) {
    let n = 0;
    this.#timer = setInterval(() => {
      n++;
      if (n === failAt) {
        this.stop();
        this.emit('error', new Error(`Tick ${n} failed`));
        return;
      }
      this.emit('tick', n);
      if (n === count) {
        this.stop();
        this.emit('done');
      }
    }, intervalMs);
  }

  stop() {
    clearInterval(this.#timer);
  }
}
