// Упражнение 4: process.exit() против process.exitCode.
// node exit-code.js exit  — «cleanup done» не напечатается
// node exit-code.js code  — напечатается, а код выхода всё равно 1

const mode = process.argv[2] ?? 'code';

setTimeout(() => console.log('cleanup done'), 100);

if (mode === 'exit') {
  process.exit(1); // процесс завершается немедленно, таймер не сработает
} else {
  process.exitCode = 1; // код выхода запомнен, процесс доделает начатое
}
