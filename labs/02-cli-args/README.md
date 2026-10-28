# Лабораторная 2. Аргументы командной строки и коды выхода

**Цель:** научиться принимать параметры программы из командной строки,
проверять их и сообщать об ошибках так, как принято в консольных
программах: понятный текст в stderr, подсказка по использованию,
ненулевой код выхода.

**Понадобится:** лабораторная 1. Упражнения делайте в папке `sandbox-02`
с `package.json`, где есть `"type": "module"`.

**Примерное время:** 1,5 часа.

## Теория

### `process.argv`

Массив строк: путь к `node`, путь к скрипту, затем всё, что написали
после имени скрипта.

```bash
node server.js --port 5000
```

```js
process.argv; // ['C:\\...\\node.exe', 'C:\\...\\server.js', '--port', '5000']
process.argv.slice(2); // ['--port', '5000'] — только наши аргументы
```

Разбирать такой массив вручную неудобно: флаги идут в любом порядке,
бывают `--port=5000` и `--port 5000`, короткие `-p`. Поэтому в Node.js
есть встроенный разборщик.

### `util.parseArgs`

```js
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    port: { type: 'string' },
    verbose: { type: 'boolean', short: 'v', default: false },
  },
  strict: true, // неизвестный флаг — ошибка, а не молчание
});
// node app.js --port 5000 -v → values = { port: '5000', verbose: true }
```

- Типов всего два: `'string'` и `'boolean'`. **Числа приходят строками**,
  переводить их в числа и проверять — ваша задача.
- В режиме `strict: true` при неизвестном флаге или флаге без значения
  `parseArgs` **выбрасывает исключение** (`error.code` вида
  `ERR_PARSE_ARGS_UNKNOWN_OPTION`). Его нужно поймать в `try/catch`
  и показать пользователю.
- Флаг, который не передали, приходит как `undefined`, если у него нет `default`.
- `strict: true` запрещает и лишние слова без флага (`node app.js extra`):
  «Unexpected argument 'extra'». Если они нужны, добавьте `allowPositionals: true`
  и читайте их из `positionals`.
- Значение, которое начинается с минуса, `parseArgs` принимает за флаг:
  `--times -1` — ошибка «argument is ambiguous». Такое значение пишут
  через знак равенства: `--times=-1`.
- Аргументы по умолчанию берутся из `process.argv`. Если передать
  `args: [...]`, функцию удобно проверять на своих массивах.

### Ловушки `Number()`

```js
Number('5000'); // 5000
Number('abc'); // NaN
Number(''); // 0     ← пустая строка стала нулём
Number(' 80 '); // 80    ← пробелы молча отброшены
Number('1e3'); // 1000  ← экспоненциальная запись
Number('0x50'); // 80    ← шестнадцатеричная запись
```

Надёжнее сначала проверить, что строка состоит только из цифр
(`/^\d+$/.test(value)`), и уже потом проверять диапазон.

### stdout, stderr и код выхода

- `console.log` пишет в **stdout**: это результат работы программы.
- `console.error` пишет в **stderr**: ошибки и диагностика.
  Если перенаправить вывод в файл (`node app.js > out.txt`),
  ошибки всё равно появятся на экране.
- **Код выхода** — число, которое процесс возвращает системе:
  `0` — успех, всё остальное — ошибка. Скрипты и CI проверяют именно его.
  Посмотреть код последней команды: `echo $?` в bash,
  `$LASTEXITCODE` в PowerShell.

`parseArgs` при ошибке выбрасывает исключение. Пока достаточно знать, что его
ловят так (подробно об ошибках — в лабораторной 3):

```js
try {
  const { values } = parseArgs({ options, strict: true });
} catch (error) {
  console.error(`Error: ${error.message}`); // error.message — текст ошибки
}
```

Свою ошибку удобно сделать отдельным классом. Одна строка
`class UsageError extends Error {}` создаёт новый вид ошибки, который
ведёт себя как обычный `Error`. Выбрасывают её так:
`throw new UsageError('Option --port is required')`. Проверить, что пойманная
ошибка именно эта, можно через `error instanceof UsageError`.

Задать код выхода можно двумя способами:

```js
process.exitCode = 1; // запомнить код; процесс доделает начатое и завершится сам
process.exit(1); // завершить процесс немедленно
```

`process.exit()` обрывает всё: таймеры не сработают, недописанный вывод
может потеряться, соединения не закроются. Поэтому в нормальном коде
используют `process.exitCode`, а функция `main` просто делает `return`.

### Usage

Когда аргументы неверны, хорошая программа говорит, что не так,
и показывает, как правильно:

```
Error: Option --port is required
Usage: node server.js --port <1-65535>
```

## Упражнения

Решения лежат в [solution/](solution/).

### Упражнение 1. Что в `process.argv`

Напишите `argv.js`, который печатает каждый элемент `process.argv`
с индексом. Запустите его с аргументами `--port 5000 "two words" -x`.
Сколько элементов получилось? Что сделали кавычки?

### Упражнение 2. Приветствие с флагами

Напишите `greet.js`:

- `--name <имя>` — обязательный;
- `--times <n>` — сколько раз поздороваться, целое число от 1 до 10,
  по умолчанию 1;
- `--shout` или `-s` — кричать (заглавными буквами);
- `--help` или `-h` — показать usage и выйти с кодом 0.

Любая ошибка в аргументах — сообщение в stderr, usage и код выхода 1.
Для своих ошибок заведите класс `class UsageError extends Error {}`
(подробнее о классах ошибок — в лабораторной 3).

**Проверка:**

| команда                                 | вывод                                      | код |
| --------------------------------------- | ------------------------------------------ | --- |
| `node greet.js --name Ann --times 2 -s` | `HELLO, ANN!` дважды                       | 0   |
| `node greet.js --times 2`               | `Error: Option --name is required` и usage | 1   |
| `node greet.js --name Ann --times 50`   | ошибка про диапазон `--times`              | 1   |
| `node greet.js --name Ann --colour red` | `Error: Unknown option '--colour'`         | 1   |
| `node greet.js --name`                  | ошибка «argument missing»                  | 1   |
| `node greet.js --name Ann --times -1`   | ошибка «argument is ambiguous»             | 1   |
| `node greet.js --name Ann --times=-1`   | ошибка про диапазон `--times`              | 1   |
| `node greet.js --name Ann extra`        | ошибка «Unexpected argument 'extra'»       | 1   |
| `node greet.js -h`                      | только usage                               | 0   |

### Упражнение 3. Проверка порта

Напишите функцию `parsePort(value)`. Она принимает строку и возвращает
число от 1 до 65535 либо выбрасывает ошибку с понятным текстом.
Прогоните её на значениях
`'5000', '1', '65535', '0', '65536', 'abc', '', ' 80', '5.5', '1e3', '0x50', '-1'`.
Правильными должны оказаться только первые три.

### Упражнение 4. `exit` против `exitCode`

Напишите `exit-code.js`. Он ставит таймер, который через 100 мс печатает
`cleanup done`. Затем, если первый аргумент `exit`, вызывает
`process.exit(1)`, а иначе присваивает `process.exitCode = 1`.

| команда                  | вывод          | код |
| ------------------------ | -------------- | --- |
| `node exit-code.js exit` | ничего         | 1   |
| `node exit-code.js code` | `cleanup done` | 1   |

Почему в первом случае таймер не сработал?

## Шаг проекта

В проекте `chat/` создайте `lib/cli.js` с общими помощниками для сервера
и клиента:

- `class UsageError extends Error {}`;
- `parseOptions(options)` — вызывает `parseArgs` с `strict: true`
  и возвращает объект `values`, а любую ошибку `parseArgs` превращает
  в `UsageError` с тем же текстом;
- `requireOption(values, name)` — возвращает значение или выбрасывает
  `UsageError('Option --<name> is required')`. Пустая строка (`--port=`)
  тоже считается отсутствующим значением;
- `parsePort(value)` — из упражнения 3, но выбрасывает `UsageError`.

И заготовку `server.js` с функцией `main()`: она разбирает `--port` через
эти помощники, при `UsageError` печатает в stderr `Error: ...` и usage
и ставит код выхода 1, а при успехе пока просто пишет `Would listen on port N`.

| команда                      | вывод                                                                         | код |
| ---------------------------- | ----------------------------------------------------------------------------- | --- |
| `node server.js --port 5000` | `Would listen on port 5000`                                                   | 0   |
| `node server.js`             | `Error: Option --port is required` и `Usage: node server.js --port <1-65535>` | 1   |
| `node server.js --port abc`  | `Error: Port must be an integer from 1 to 65535, got "abc"` и usage           | 1   |
| `node server.js --prot 5000` | `Error: Unknown option '--prot'...` и usage                                   | 1   |

## Контрольные вопросы

1. Почему `process.argv.slice(2)`, а не весь массив?
2. Почему `parseArgs` возвращает порт строкой и что с этим делать?
3. Чем опасен `Number(value)` без дополнительной проверки?
4. Зачем ошибки писать в stderr, а не в stdout?
5. Почему `process.exitCode = 1` лучше, чем `process.exit(1)`?
6. Что увидит скрипт CI, если программа напечатала ошибку,
   но завершилась с кодом 0?

## Где это в эталонном проекте

- [lib/cli.js](../../lib/cli.js) — `UsageError`, `parseOptions`, `requireOption`, `parsePort`.
- `parseServerArgs` и `main` в [server.js](../../server.js),
  `parseClientArgs` в [client.js](../../client.js).
- `git show step-3:lib/cli.js` — первая версия `lib/cli.js`.
