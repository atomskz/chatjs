// Упражнение 3: граница ошибок.
// node boundary.js         — ошибка одной задачи не мешает остальным
// node boundary.js nobound — без границы первая же ошибка роняет процесс

const tasks = [
  () => 'ok',
  () => {
    throw new Error('task failed');
  },
  () => null.length, // баг: TypeError
  () => 'ok again',
];

const useBoundary = process.argv[2] !== 'nobound';
let failed = 0;

tasks.forEach((task, index) => {
  if (!useBoundary) {
    console.log(`#${index}: ${task()}`);
    return;
  }
  try {
    console.log(`#${index}: ${task()}`);
  } catch (error) {
    failed++;
    console.error(`#${index} failed: ${error.name}: ${error.message}`);
  }
});

console.log(`Done, failed: ${failed} of ${tasks.length}`);
