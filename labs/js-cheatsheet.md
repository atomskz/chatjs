# Шпаргалка: синтаксис JavaScript, который встречается в проекте

Лабораторные объясняют Node.js и сеть, но не сам язык. Если в примере
кода непонятна какая-то запись, ищите её здесь. Каждый пример можно
выполнить в REPL: запустите `node` без аргументов и вставьте строку.

## Переменные и строки

```js
const port = 5000; // константа: переприсвоить нельзя (но объект внутри менять можно)
let count = 0; // переменная, которую будем менять
// var не используем: у него странная область видимости

const text = `Port ${port} is busy`; // шаблонная строка: ${...} подставляет значение
const big = 64 * 1024; // 65536
const minute = 60_000; // _ в числе — просто разделитель для читаемости
```

## Функции

```js
function sum(a, b) {
  return a + b;
}

const double = (x) => x * 2; // стрелочная функция; одно выражение — это и есть результат
const greet = (name = 'guest') => `Hello, ${name}`; // значение параметра по умолчанию

// Стрелочная функция, возвращающая объект: скобки вокруг {} обязательны,
// иначе {} будет считаться телом функции.
const join = (nick) => ({ type: 'join', nick });
```

## Деструктуризация

Достаёт поля объекта или элементы массива в переменные:

```js
const { host, port } = options; // const host = options.host; const port = options.port;
const { port: actualPort } = server.address(); // с переименованием
const [first, second] = ['a', 'b', 'c']; // first = 'a', second = 'b'
const [command] = input.split(' '); // первое слово
const [, ...rest] = process.argv; // пропустить первый элемент, остальные — в массив rest
```

В параметрах функции — так передают «именованные аргументы»:

```js
function listen({ port, onConnection }) {}
listen({ port: 5000, onConnection: handle }); // порядок полей не важен

// Значения по умолчанию для полей и для всего объекта сразу:
// new ChatServer() и new ChatServer({}) оба получат logger = console.
class ChatServer {
  constructor({ logger = console } = {}) {}
}
```

## Spread (`...`)

```js
const copy = [...array]; // копия массива
const chars = [...'😀hi']; // ['😀', 'h', 'i'] — строка разбита на символы
const message = { ...original, isOwn: true }; // копия объекта плюс новое поле
Math.max(...[1, 5, 3]); // 5: массив разложен на аргументы
```

## `?.` и `??`

```js
client?.nick; // если client — null или undefined, результат undefined, а не ошибка
error.errors?.[0]?.code; // то же для элемента массива

value ?? 'default'; // 'default', только если value — null или undefined
0 ?? 5; // 0  (а 0 || 5 дало бы 5: || заменяет любое «ложное» значение)
'' ?? 'x'; // ''
```

## Сравнения и проверки типов

```js
a === b; // строгое равенство: без приведения типов. == не используем: 1 == '1' — true
typeof 'hi'; // 'string'; бывает 'number', 'boolean', 'object', 'function', 'undefined'
typeof null; // 'object' — историческая ошибка языка, проверяйте null отдельно
Array.isArray([1]); // true
error instanceof UsageError; // создан ли объект этим классом (или наследником)
Number.isInteger(5.5); // false
```

## Объекты

```js
Object.keys({ a: 1, b: 2 }); // ['a', 'b']
Object.entries({ a: 1 }); // [['a', 1]]
for (const [key, value] of Object.entries(obj)) {
}

// Добавить поля к готовому объекту и вернуть его же:
const error = Object.assign(new Error('Timed out'), { code: 'ETIMEDOUT' });
```

## Массивы

```js
[1, 2, 3].includes(2); // true
[1, 2, 3].map((x) => x * 2); // [2, 4, 6]
[1, 2, 3].filter((x) => x > 1); // [2, 3]
[1, 2, 3].reduce((sum, x) => sum + x, 0); // 6
['a', 'b'].join(', '); // 'a, b'
[1, 2, 3].at(-1); // 3 — последний элемент
array.push(x); // добавить в конец
array.pop(); // забрать последний

for (const item of array) {
} // перебор значений (работает и для Map, Set, строк)
```

## Строки

```js
'  hi  '.trim(); // 'hi'
'/users'.startsWith('/'); // true
'a b  c'.split(/\s+/); // ['a', 'b', 'c'] — разбить по регулярному выражению
'7'.padStart(2, '0'); // '07' — дополнить слева до длины 2
'INFO'.padEnd(5); // 'INFO ' — дополнить справа пробелами
'ab'.repeat(3); // 'ababab'
'Hi'.toUpperCase(); // 'HI'
```

## Дата и время

```js
Date.now(); // текущее время в миллисекундах с 1970 года (unix ms), например 1729425600000
const date = new Date(1729425600000); // объект даты из unix ms
date.getHours(); // часы в местном часовом поясе, 0–23 (так же getMinutes, getSeconds)
date.toISOString(); // '2024-10-20T12:00:00.000Z' — в UTC, удобно для логов
date.toLocaleTimeString(); // время в формате, принятом в системе

// Формат ЧЧ:ММ:СС для чата:
[date.getHours(), date.getMinutes(), date.getSeconds()]
  .map((part) => String(part).padStart(2, '0'))
  .join(':'); // '14:05:12'
```

## Управление потоком

```js
switch (message.type) {
  case 'join':
    handleJoin(message);
    break; // без break выполнение «провалится» в следующий case
  case 'msg':
    handleMessage(message);
    break;
  default:
    console.log('unknown type');
}

// Ранний выход вместо вложенных if:
function handle(text) {
  if (text === '') return;
  if (!isValid(text)) return showError();
  send(text);
}
```

## Классы

Подробно — в лабораторной 8.

```js
class Ticker extends EventEmitter {
  #timer = null; // закрытое поле
  count = 0; // открытое поле

  constructor(options) {
    super(); // вызвать конструктор родителя — обязательно до обращения к this
  }

  start() {} // метод
  #tick() {} // закрытый метод
  static create() {} // метод самого класса: Ticker.create()
}
```
