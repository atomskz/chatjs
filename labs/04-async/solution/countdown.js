// Упражнение 2: последовательное ожидание через await.

import { delay } from './async-utils.js';

for (let i = 3; i > 0; i--) {
  console.log(i);
  await delay(500); // await на верхнем уровне модуля разрешён в ES-модулях
}
console.log(await delay(500, 'Go!'));
