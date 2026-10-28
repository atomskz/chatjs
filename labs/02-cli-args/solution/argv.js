// Упражнение 1: что лежит в process.argv.

process.argv.forEach((value, index) => {
  console.log(`argv[${index}] = ${JSON.stringify(value)}`);
});
