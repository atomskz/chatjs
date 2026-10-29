// Упражнение 7: отклонённый промис, который никто не обработал.
// node unhandled.js     — процесс падает с кодом 1
// node unhandled.js fix — ошибка поймана

async function loadConfig() {
  throw new Error('config.json is broken');
}

if (process.argv[2] === 'fix') {
  try {
    await loadConfig();
  } catch (error) {
    console.error(`Cannot start: ${error.message}`);
    process.exitCode = 1;
  }
} else {
  loadConfig(); // забыли await и catch — «unhandled rejection»
  setTimeout(() => console.log('this line is never printed'), 100);
}
