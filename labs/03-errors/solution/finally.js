// Упражнение 2: finally выполняется всегда — и после return, и после throw.

function withResource(action) {
  console.log('  open');
  try {
    return action();
  } finally {
    console.log('  close'); // освобождаем ресурс при любом исходе
  }
}

console.log('success:');
console.log(`  result = ${withResource(() => 42)}`);

console.log('failure:');
try {
  withResource(() => {
    throw new Error('boom');
  });
} catch (error) {
  console.log(`  caught: ${error.message}`);
}
