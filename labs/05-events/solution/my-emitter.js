// Упражнение 3: свой маленький EventEmitter.
// Внутри нет никакой магии: это просто Map «имя события → массив функций».

export class MyEmitter {
  #listeners = new Map();

  on(name, listener) {
    if (!this.#listeners.has(name)) {
      this.#listeners.set(name, []);
    }
    this.#listeners.get(name).push(listener);
  }

  off(name, listener) {
    const list = this.#listeners.get(name) ?? [];
    // Удаляем ровно ту же функцию: сравнение по ссылке, как в настоящем EventEmitter.
    this.#listeners.set(
      name,
      list.filter((item) => item !== listener),
    );
  }

  emit(name, ...args) {
    const list = this.#listeners.get(name) ?? [];
    // Копия массива: если обработчик отпишется во время emit, перебор не собьётся.
    for (const listener of [...list]) {
      listener(...args); // синхронно, по порядку подписки
    }
    return list.length > 0;
  }

  once(name, listener) {
    const wrapper = (...args) => {
      this.off(name, wrapper);
      listener(...args);
    };
    this.on(name, wrapper);
  }
}
