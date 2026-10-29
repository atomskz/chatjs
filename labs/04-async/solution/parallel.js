// Упражнение 5: последовательно, параллельно и «все, даже с ошибками».

import { delay } from './async-utils.js';

async function fakeFetch(name, ms, shouldFail = false) {
  await delay(ms);
  if (shouldFail) {
    throw new Error(`${name} failed`);
  }
  return `${name} data`;
}

async function measure(label, action) {
  const start = Date.now();
  const result = await action();
  console.log(`${label}: ${Date.now() - start} ms`, result);
}

await measure('sequential', async () => {
  const a = await fakeFetch('a', 300);
  const b = await fakeFetch('b', 300);
  return [a, b];
});

await measure('Promise.all', () => Promise.all([fakeFetch('a', 300), fakeFetch('b', 300)]));

try {
  await Promise.all([fakeFetch('a', 300), fakeFetch('b', 100, true)]);
} catch (error) {
  console.log(`Promise.all rejected: ${error.message}`);
}

const results = await Promise.allSettled([fakeFetch('a', 300), fakeFetch('b', 100, true)]);
console.log(
  'Promise.allSettled:',
  results.map((r) => (r.status === 'fulfilled' ? r.value : `error: ${r.reason.message}`)),
);
