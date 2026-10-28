// Упражнение 2: первый Ctrl+C — аккуратное завершение, второй — немедленное.

const work = setInterval(() => console.log('working...'), 500);

async function cleanup() {
  console.log('Shutting down, press Ctrl+C again to force');
  clearInterval(work);
  await new Promise((resolve) => setTimeout(resolve, 3000)); // «сохраняем данные»
  console.log('Cleanup finished');
}

process.once('SIGINT', () => {
  // Пока работает cleanup, повторный Ctrl+C завершает процесс сразу.
  // 130 = 128 + номер сигнала SIGINT (2) — так принято в Unix-оболочках.
  process.once('SIGINT', () => {
    console.log('Forced exit');
    process.exit(130);
  });
  cleanup();
});
