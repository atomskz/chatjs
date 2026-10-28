// Упражнение 2: первая программа в файле.
// node hello.js        → Hello, world!
// node hello.js Ann    → Hello, Ann!

const name = process.argv[2] ?? 'world';
console.log(`Hello, ${name}!`);
console.log(`I am running in ${process.cwd()}`);
