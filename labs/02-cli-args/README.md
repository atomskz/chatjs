# Лабораторная 2. Аргументы командной строки и коды выхода

**Цель:** научиться принимать параметры программы из командной строки,
проверять их и сообщать об ошибках так, как принято в консольных
программах: понятный текст в stderr, подсказка по использованию,
ненулевой код выхода.

**Понадобится:** лабораторная 1. Упражнения делайте в папке `sandbox-02`
с `package.json`, где есть `"type": "module"`.

**Примерное время:** 3 часа, два занятия.

**Как работать:** каждый пример запускайте у себя и сверяйте вывод.
В разминках сначала запишите **свой** ответ, потом проверьте и только
потом смотрите [answers.md](answers.md).

---

## Занятие 1. Как программа получает параметры

### 1.1. Зачем

Сервер чата должен запускаться на разных портах, а клиент — подключаться
к разным адресам под разными никами. Менять для этого код каждый раз
нельзя. Поэтому настройки передают **при запуске**:

```bash
node server.js --port 5000
node client.js --host 192.168.1.10 --port 5000 --nick alice
```

**Аналогия: заказ в кофейне.** «Капучино, большой, без сахара» — название
напитка одно, а уточнения меняются. В командной строке так же: программа
одна, а **флаги** (`--port`, `--nick`) уточняют, как именно её запустить.

### 1.2. `process.argv`: что получает программа

**Разобранный пример.** `argv.js`:

```js
process.argv.forEach((value, index) => {
  console.log(`argv[${index}] = ${JSON.stringify(value)}`);
});
```

```
$ node argv.js --port 5000 "two words" -x
argv[0] = "C:\\Program Files\\nodejs\\node.exe"
argv[1] = "C:\\Users\\ann\\js-labs\\sandbox-02\\argv.js"
argv[2] = "--port"
argv[3] = "5000"
argv[4] = "two words"
argv[5] = "-x"
```

```
node argv.js --port 5000 "two words" -x
 │      │       │     │       │       │
[0]    [1]     [2]   [3]     [4]     [5]
путь   путь    дальше — всё, что вы написали после имени файла
к node к файлу
```

- `process.argv` — массив строк. Первые два элемента — путь к `node`
  и путь к файлу программы, их обычно пропускают: `process.argv.slice(2)`.
- Командную строку на слова режет **оболочка** (bash, PowerShell), а не
  Node.js: она делит строку по пробелам и сама убирает кавычки.
  Поэтому `"two words"` приходит одним элементом, без кавычек.
- Все элементы — **строки**, даже `5000`.

**Через npm.** Если программу запускают скриптом из `package.json`,
её аргументы пишут после `--`:

```bash
npm run server -- --port 5000   # программа получит ['--port', '5000']
npm run server --port 5000      # программа получит только ['5000']: --port забрал себе npm
```

### 1.3. `util.parseArgs`: разбор флагов

Разбирать массив вручную неудобно: флаги идут в любом порядке,
бывают `--port=5000` и `--port 5000`, короткие `-p`. В Node.js для этого
есть встроенный разборщик.

**Разобранный пример.** `pa.js`:

```js
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  options: {
    name: { type: 'string' },
    shout: { type: 'boolean', short: 's', default: false },
  },
  allowPositionals: true,
});
console.log(values, positionals);
```

| команда                       | `values`                        | `positionals` |
| ----------------------------- | ------------------------------- | ------------- |
| `node pa.js --name Ann -s`    | `{ name: 'Ann', shout: true }`  | `[]`          |
| `node pa.js --name=Ann`       | `{ name: 'Ann', shout: false }` | `[]`          |
| `node pa.js`                  | `{ shout: false }`              | `[]`          |
| `node pa.js hello --name Ann` | `{ name: 'Ann', shout: false }` | `['hello']`   |

В консоли `values` печатается как `[Object: null prototype] { name: 'Ann', shout: true }`.
Пометка `null prototype` значит лишь, что это «голый» объект без встроенных
методов; работать с ним можно как с обычным.

Что видно из примера:

- `type: 'string'` — флаг со значением (`--name Ann` или `--name=Ann`);
  `type: 'boolean'` — флаг-переключатель (`-s`), значение `true`, если он есть.
- `short: 's'` — короткая форма из одной буквы.
- `default` — значение, если флага нет. Без `default` флага просто нет
  в `values` (`values.name === undefined`).
- `positionals` — слова без флага. Без `allowPositionals: true` они запрещены.

**Строгий режим.** Строгий режим (`strict: true`) включён по умолчанию,
в проекте его пишут явно, чтобы было видно. В нём `parseArgs` **выбрасывает
исключение** на любой ошибке пользователя:

| команда                           | сообщение                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `--colour red` (неизвестный флаг) | `Unknown option '--colour'`                                                    |
| `--name` (без значения)           | `Option '--name <value>' argument missing`                                     |
| `extra` (лишнее слово)            | `Unexpected argument 'extra'. This command does not take positional arguments` |
| `--times -1` (значение с минуса)  | `Option '--times' argument is ambiguous` — пишите `--times=-1`                 |

У таких ошибок `error.code` начинается с `ERR_PARSE_ARGS_`. Как их ловить —
в занятии 2.

Ещё одна ловушка: `default` должен быть того же типа, что и `type`.
Для `type: 'string'` — строка `'1'`, а не число `1`. Иначе:

```
TypeError [ERR_INVALID_ARG_TYPE]: The "options.times.default" property must be of type string. Received type number (1)
```

Это ошибка программиста в описании опций, а не пользователя: код у неё
`ERR_INVALID_ARG_...`, а не `ERR_PARSE_ARGS_...`.

### Разминка 1

Для `pa.js` из примера предскажите `values` и `positionals`, затем проверьте:

1. `node pa.js -s --name "Ann Lee"`
2. `node pa.js --shout --shout`
3. `node pa.js one two`

### 1.4. Числа приходят строками

Все аргументы — строки, и `parseArgs` их не переводит в числа. С этим
легко ошибиться:

```js
'5000' + 1; // '50001' — склеились строки!
Number('5000') + 1; // 5001
```

Но и `Number()` слишком «добрый»:

```js
Number('5000'); // 5000
Number('abc'); // NaN
Number(''); // 0     ← пустая строка стала нулём
Number(' 80 '); // 80    ← пробелы молча отброшены
Number('1e3'); // 1000  ← экспоненциальная запись
Number('0x50'); // 80    ← шестнадцатеричная запись
```

Надёжнее сначала проверить, что строка состоит только из цифр,
и уже потом проверять диапазон:

```js
const port = Number(value);
if (!/^\d+$/.test(value) || port < 1 || port > 65535) {
  // ошибка
}
```

`/^\d+$/` — регулярное выражение, шаблон для проверки строк (подробно —
в лабораторной 6): `^` — начало строки, `\d` — цифра, `+` — «одна или
больше», `$` — конец строки. Вместе: «от начала до конца только цифры».
Метод `.test(value)` возвращает `true` или `false`. Без `^` и `$` шаблон
нашёл бы цифры внутри `'5x'`, и проверка прошла бы.

### Разминка 2

Какие из значений пройдут проверку порта выше: `'8080'`, `'080'`, `'99999'`,
`'12 34'`, `'٣'` (арабская цифра 3)? Проверьте в REPL.

---

## Занятие 2. Ошибки ввода, stdout, stderr и коды выхода

### 2.1. Два потока вывода

**Зачем.** Вывод программы часто сохраняют в файл или передают другой
программе. Ошибки при этом должны оставаться видны человеку, а не
прятаться в файле среди результатов.

- `console.log` пишет в **stdout** — это результат работы программы.
- `console.error` пишет в **stderr** — ошибки и диагностика.

```
              ┌─ stdout (console.log)   ──► экран, или файл при  > out.txt
программа ────┤
              └─ stderr (console.error) ──► экран (в файл — только при 2> err.txt)
```

**Разобранный пример.**

```bash
node -e "console.log('result'); console.error('problem')" > out.txt
```

На экране — только `problem`, а в `out.txt` — только `result`. Программа
сообщила об ошибке, и человек её увидел, хотя результат ушёл в файл.

### 2.2. Код выхода

**Код выхода** — число, которое программа возвращает системе при завершении:
`0` — успех, всё остальное — ошибка. Человек его не видит, а скрипты и
системы сборки (CI) проверяют именно его.

```bash
node -e "process.exitCode = 1" && echo "printed only on success"
echo $?          # bash: код последней команды — 1
```

`&&` запускает следующую команду, только если предыдущая завершилась
с кодом 0. Так устроены цепочки «собрать && протестировать && выложить»:
если тесты упали с кодом 1, выкладка не начнётся. А если программа
напечатала ошибку, но вернула 0, цепочка пойдёт дальше, как будто всё хорошо.

Посмотреть код последней команды: `echo $?` в bash, `$LASTEXITCODE`
в PowerShell (там `$?` — это только `True`/`False`). В Windows PowerShell 5.1
оператора `&&` нет: цепочки из этой лабораторной запускайте в Git Bash
или PowerShell 7 (`pwsh`).

**Как задать код в Node.js.**

```js
process.exitCode = 1; // запомнить код; процесс доделает начатое и завершится сам
process.exit(1); // завершить процесс немедленно
```

**Разобранный пример.** `exit-code.js`:

```js
const mode = process.argv[2] ?? 'code';
setTimeout(() => console.log('cleanup done'), 100);
if (mode === 'exit') {
  process.exit(1);
} else {
  process.exitCode = 1;
}
```

| команда                  | вывод          | код |
| ------------------------ | -------------- | --- |
| `node exit-code.js exit` | ничего         | 1   |
| `node exit-code.js code` | `cleanup done` | 1   |

`process.exit()` обрывает всё: таймеры не сработают, недописанный вывод
может потеряться, соединения не закроются. Поэтому в нормальном коде
используют `process.exitCode`, а функция `main` просто делает `return`.

### 2.3. Ошибки разбора: первое знакомство с `try/catch`

`parseArgs` при ошибке выбрасывает исключение. Подробно об ошибках —
в лабораторной 3, а пока хватит такого:

- `throw new Error('текст')` прерывает функцию и «выбрасывает» ошибку наверх;
- `try { ... } catch (error) { ... }` ловит ошибку, выброшенную внутри `try`.
  В `error.message` лежит её текст.

Свою ошибку удобно сделать отдельным классом. Одна строка
`class UsageError extends Error {}` создаёт новый вид ошибки, который
ведёт себя как обычный `Error`. Выбрасывают её так:
`throw new UsageError('Option --port is required')`. Проверить, что пойманная
ошибка именно эта, можно через `error instanceof UsageError`.

**Разобранный пример: шаблон любой консольной программы.**

```js
import { parseArgs } from 'node:util';

const USAGE = 'Usage: node greet.js --name <name>';

class UsageError extends Error {}

function parseGreetArgs() {
  let values;
  try {
    ({ values } = parseArgs({ options: { name: { type: 'string' } }, strict: true }));
  } catch (error) {
    throw new UsageError(error.message); // любая ошибка разбора → UsageError
  }
  if (!values.name) {
    throw new UsageError('Option --name is required'); // своя проверка
  }
  return values;
}

function main() {
  let options; // объявлена ДО try, иначе после блока её не будет видно
  try {
    options = parseGreetArgs();
  } catch (error) {
    if (!(error instanceof UsageError)) throw error; // чужую ошибку не глотаем
    console.error(`Error: ${error.message}\n${USAGE}`); // в stderr
    process.exitCode = 1; // и ненулевой код
    return;
  }
  console.log(`Hello, ${options.name}!`); // результат — в stdout
}

main();
```

Что здесь важно:

- **Разбор отдельно от работы.** `parseGreetArgs` только разбирает
  и проверяет, `main` решает, что делать с результатом.
- **`let options` до `try`.** Переменные `let` и `const` видны только
  внутри тех фигурных скобок `{}`, где объявлены. `const options = ...`
  внутри `try` после блока уже не видна: `ReferenceError: options is not defined`.
- **`({ values } = ...)`** — деструктуризация в уже объявленную переменную.
  Круглые скобки обязательны, иначе `{` примут за начало блока.
- **`if (!(error instanceof UsageError)) throw error`** — если упало что-то
  другое (баг), не прячем его под «неверные аргументы»: пусть будет виден
  стек. Почему это важно — в лабораторной 3.

### 2.4. Usage

Когда аргументы неверны, хорошая программа говорит, что не так,
и показывает, как правильно:

```
Error: Option --port is required
Usage: node server.js --port <1-65535>
```

В строке usage принято так: `<...>` — что подставить, `[...]` — необязательное,
`a|b` — один из вариантов. Когда пользователь сам попросил справку (`--help`),
usage — это результат работы программы: он идёт в stdout, а код выхода — 0.
Когда usage показывают из-за ошибки, он идёт в stderr вместе с ошибкой, а код — 1.

### Разминка 3

1. Программа напечатала `Error: Option --port is required` через `console.log`
   и завершилась с кодом 0. Какие две вещи здесь не так и чем они мешают?
2. `node server.js --port 5000 > log.txt`. Сервер не смог занять порт
   и напечатал ошибку через `console.error`. Где её увидят?

---

## Упражнения

Решения лежат в [solution/](solution/). Упражнения 1–3 — к первому занятию,
4–5 — ко второму.

### Упражнение 1. Что в `process.argv`

Повторите пример 1.2 с аргументами `--port 5000 "two words" -x`. Сколько
элементов получилось? Что сделали кавычки? Добавьте в `package.json` скрипт
`"argv": "node argv.js"` и сравните `npm run argv -- --port 5000`
и `npm run argv --port 5000`. Во втором случае npm ещё и предупредит
`Unknown cli config "--port"`: флаг достался самому npm.

### Упражнение 2. Проверка порта

Напишите функцию `parsePort(value)`. Она принимает строку и возвращает
число от 1 до 65535 либо выбрасывает ошибку с понятным текстом.
Прогоните её в цикле на значениях
`'5000', '1', '65535', '0', '65536', 'abc', '', ' 80', '5.5', '1e3', '0x50', '-1'`.
Правильными должны оказаться только первые три.

### Упражнение 3. `exit` против `exitCode`

Повторите пример из 2.2 и сравните оба варианта. Затем проверьте код
выхода через `echo $?` (или `$LASTEXITCODE`) и цепочку
`node exit-code.js code && echo next`. Почему в первом варианте таймер
не сработал? Выполнилось ли `echo next`?

### Упражнение 4. Приветствие с флагами

На основе шаблона из 2.3 напишите `greet.js`:

- `--name <имя>` — обязательный;
- `--times <n>` — сколько раз поздороваться, целое число от 1 до 10,
  по умолчанию `'1'` (строкой!);
- `--shout` или `-s` — кричать (заглавными буквами);
- `--help` или `-h` — показать usage в stdout и выйти с кодом 0.

Любая ошибка в аргументах — сообщение в stderr, usage и код выхода 1.

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

### Упражнение 5. Куда ушёл вывод

Запустите `node greet.js --times 2 > out.txt` и `node greet.js --name Ann > out.txt`.
Что оказалось на экране, а что в файле в каждом случае? Почему?

## Типичные ошибки

| что видите                                                                                  | почему                                       | что делать                                                  |
| ------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| `'5000' + 1` дал `'50001'`                                                                  | аргументы — строки, `+` склеил их            | `Number(value)` после проверки                              |
| `--port` из `npm run server --port 5000` не дошёл до программы                              | npm забрал флаг себе                         | `npm run server -- --port 5000`                             |
| `TypeError [ERR_INVALID_ARG_TYPE]: The "options.x.default" property must be of type string` | `default` числом при `type: 'string'`        | `default: '1'`                                              |
| `Option '--name <value>' argument missing`                                                  | флаг без значения                            | передать значение; это ошибка пользователя — показать usage |
| `Option '--times' argument is ambiguous`                                                    | значение начинается с минуса                 | `--times=-1`                                                |
| `Unexpected argument 'x'`                                                                   | лишнее слово без флага в строгом режиме      | убрать или добавить `allowPositionals: true`                |
| `ReferenceError: options is not defined`                                                    | `const` объявлен внутри `try`                | `let options;` до `try`                                     |
| программа сообщила об ошибке, но скрипт пошёл дальше                                        | забыт `process.exitCode = 1`                 | ставить ненулевой код при любой ошибке                      |
| часть вывода или «уборка» пропала                                                           | `process.exit()` оборвал работу              | `process.exitCode` и `return`                               |
| баг (`TypeError`) показан как «неверные аргументы»                                          | `catch` ловит всё подряд                     | `if (!(error instanceof UsageError)) throw error`           |
| в PowerShell `$?` печатает `True` или `False`                                               | в PowerShell `$?` — только «успешно или нет» | код выхода — в `$LASTEXITCODE`                              |

## Шаг проекта

В проекте `chat/` создайте `lib/cli.js` с общими помощниками для сервера
и клиента:

- `class UsageError extends Error {}` — ошибка пользователя, а не баг;
- `parseOptions(options)` — вызывает `parseArgs` с `strict: true`
  и возвращает объект `values`, а любую ошибку `parseArgs` превращает
  в `UsageError` с тем же текстом;
- `requireOption(values, name)` — возвращает значение или выбрасывает
  `UsageError('Option --<name> is required')`. Пустая строка (`--port=`)
  тоже считается отсутствующим значением;
- `parsePort(value)` — из упражнения 2, но выбрасывает `UsageError`.

Все четыре имени экспортируйте (`export class ...`, `export function ...`):
их импортируют `server.js`, тесты (лабораторная 7) и клиент. `parseOptions`
принимает только описание опций, например `parseOptions({ port: { type: 'string' } })`,
и сама вызывает `parseArgs({ options, strict: true })`. В `server.js`:

```js
import { UsageError, parseOptions, parsePort, requireOption } from './lib/cli.js';
```

И заготовку `server.js` с функцией `main()` по шаблону из 2.3: она разбирает
`--port` через эти помощники, при `UsageError` печатает в stderr `Error: ...`
и usage и ставит код выхода 1, а при успехе пока просто пишет
`Would listen on port N`.

| команда                      | вывод                                                                         | код |
| ---------------------------- | ----------------------------------------------------------------------------- | --- |
| `node server.js --port 5000` | `Would listen on port 5000`                                                   | 0   |
| `node server.js`             | `Error: Option --port is required` и `Usage: node server.js --port <1-65535>` | 1   |
| `node server.js --port abc`  | `Error: Port must be an integer from 1 to 65535, got "abc"` и usage           | 1   |
| `node server.js --prot 5000` | `Error: Unknown option '--prot'...` и usage                                   | 1   |

Сделайте коммит.

## Контрольные вопросы

1. Почему `process.argv.slice(2)`, а не весь массив?
2. Кто убирает кавычки вокруг `"two words"` — Node.js или оболочка?
3. Почему `parseArgs` возвращает порт строкой и что с этим делать?
4. Чем опасен `Number(value)` без дополнительной проверки?
5. Зачем ошибки писать в stderr, а не в stdout?
6. Что такое код выхода и кто его проверяет?
7. Почему `process.exitCode = 1` лучше, чем `process.exit(1)`?
8. Что увидит скрипт CI, если программа напечатала ошибку,
   но завершилась с кодом 0?

Ответы — в [answers.md](answers.md).

## Где это в эталонном проекте

- [lib/cli.js](../../lib/cli.js) — `UsageError`, `parseOptions`, `requireOption`, `parsePort`.
- `parseServerArgs` и `main` в [server.js](../../server.js),
  `parseClientArgs` в [client.js](../../client.js).
- `git show step-3:lib/cli.js` — первая версия `lib/cli.js`.
