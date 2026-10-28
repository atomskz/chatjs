// Упражнение 3: проверка ника регулярным выражением.
// ^ и $ — начало и конец строки: без них /[A-Za-z]/ нашёл бы букву где угодно.

const NICK_PATTERN = /^[A-Za-z0-9_-]{1,20}$/;

function isValidNick(nick) {
  return typeof nick === 'string' && NICK_PATTERN.test(nick);
}

const cases = [
  ['alice', true],
  ['bob_2', true],
  ['x-y', true],
  ['a'.repeat(20), true],
  ['', false],
  ['a'.repeat(21), false],
  ['two words', false],
  ['Пётр', false],
  ['ann!', false],
  ['ann\n', false],
  [42, false],
  [null, false],
];

for (const [nick, expected] of cases) {
  const actual = isValidNick(nick);
  const mark = actual === expected ? 'ok ' : 'BUG';
  console.log(`${mark} ${JSON.stringify(nick).padEnd(24)} → ${actual}`);
}
