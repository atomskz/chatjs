// Упражнения 4 и 6: delay и withTimeout. Пригодятся в лабораторной 7 для тестов.

/** Промис, который выполнится через ms миллисекунд со значением value. */
export function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Ждёт promise, но не дольше ms миллисекунд.
 * Если время вышло — отклоняется с ошибкой, у которой code === 'ETIMEDOUT'.
 */
export function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error(`Timed out after ${ms} ms`), { code: 'ETIMEDOUT' }));
    }, ms);
  });
  // Promise.race берёт результат первого завершившегося промиса.
  // finally убирает таймер: иначе он продержит процесс живым до срабатывания.
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
