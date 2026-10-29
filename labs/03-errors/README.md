# Лабораторная 3. Ошибки и исключения

**Цель:** понять, как ошибка «путешествует» по программе; научиться
выбрасывать, ловить и различать ошибки; отличать ожидаемую ошибку
(пользователь ввёл неправильный порт) от бага в коде; не давать ошибке
одной операции уронить всю программу.

**Понадобится:** лабораторная 2. Упражнения делайте в папке `sandbox-03`
с `"type": "module"` в `package.json`.

**Примерное время:** 3–4 часа, два занятия.

**Как работать:** каждый пример запускайте у себя и сверяйте вывод.
В разминках сначала запишите **свой** ответ, потом проверьте и только
потом смотрите [answers.md](answers.md).

---

## Занятие 1. Как ошибка путешествует по программе

### 1.1. Зачем

Ошибки будут всегда: пользователь введёт не то, файла не окажется на месте,
сеть оборвётся, а в коде найдётся опечатка. Хорошая программа ведёт себя
с ними по-разному:

- **ожидаемая** ошибка (неверный порт) — понятное сообщение, и программа
  либо продолжает работу, либо аккуратно завершается;
- **баг** (опечатка в коде) — громко и с указанием места, чтобы его быстро
  нашли и исправили.

**Аналогия: проблема на работе.** Сотрудник столкнулся с тем, что не может
решить сам, и «поднимает руку» — сообщает начальнику. Тот либо решает
вопрос, либо передаёт выше. Если до самого верха никто не взялся —
останавливается вся работа. В программе «поднять руку» — это `throw`,
«взять на себя» — `catch`, а «остановилась вся работа» — процесс упал.

### 1.2. Разобранный пример: ошибка летит вверх

```js
function parsePort(value) {
  console.log('parsePort: start');
  if (!/^\d+$/.test(value)) {
    throw new Error(`Bad port "${value}"`);
  }
  console.log('parsePort: end'); // не выполнится
  return Number(value);
}

function loadConfig() {
  console.log('loadConfig: start');
  const port = parsePort('abc');
  console.log('loadConfig: end'); // не выполнится
  return { port };
}

function main() {
  try {
    loadConfig();
    console.log('main: config loaded'); // не выполнится
  } catch (error) {
    console.log(`main: caught "${error.message}"`);
  }
  console.log('main: still running');
}

main();
```

```
loadConfig: start
parsePort: start
main: caught "Bad port "abc""
main: still running
```

```
main ──► loadConfig ──► parsePort ──► throw new Error(...)
  ▲           │              │
  │           └── прерван ◄──┘   остаток loadConfig не выполняется
  └── catch ◄─────────────────── ошибка летит вверх до первого try/catch
```

- `throw` немедленно прерывает функцию: строки после него не выполняются.
- Ошибка летит вверх по цепочке вызовов, прерывая каждую функцию по дороге,
  пока не встретит `try/catch`.
- Если её поймали — программа продолжает работу после `catch`
  (`main: still running`).

**Если никто не поймал.** Короткая версия той же программы без `try/catch`:

```js
function parsePort(value) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Bad port "${value}"`);
  }
  return Number(value);
}
function loadConfig() {
  return { port: parsePort('abc') };
}
function main() {
  loadConfig();
  console.log('main: still running');
}
main();
```

Node.js напечатает:

```
file:///.../chain.js:3
    throw new Error(`Bad port "${value}"`);
          ^

Error: Bad port "abc"
    at parsePort (file:///.../chain.js:3:11)
    at loadConfig (file:///.../chain.js:8:18)
    at main (file:///.../chain.js:11:3)
    at file:///.../chain.js:14:1

Node.js v24.19.0
```

Процесс завершится с кодом 1. Строки `at ...` — **стек вызовов**: сверху место,
где ошибка создана, ниже — кто кого вызывал. Читается снизу вверх как путь:
файл вызвал `main`, `main` — `loadConfig`, `loadConfig` — `parsePort`.

### 1.3. Объект ошибки

```js
throw new Error('Port is required');
```

Выбросить можно любое значение, даже строку (`throw 'oops'`), но принято
бросать объект `Error`: только у него есть стек. Если бросить строку, Node.js
покажет строку с `throw` и `oops`, но без стека: не будет видно, кто вызвал
эту функцию.

| свойство  | что это                                                                 |
| --------- | ----------------------------------------------------------------------- |
| `message` | текст для человека                                                      |
| `name`    | вид ошибки: `Error`, `TypeError`, `SyntaxError`...                      |
| `stack`   | стек вызовов — где ошибка создана                                       |
| `cause`   | исходная ошибка, если эту создали «поверх» другой                       |
| `code`    | машиночитаемый код: `ENOENT`, `ERR_PARSE_ARGS_...`...                   |
| `syscall` | у ошибок ОС: какой системный вызов не удался (`open`, `read`, `listen`) |
| `path`    | у ошибок файловой системы: о каком файле речь                           |

Поле `code` бывает у ошибок двух семейств:

- **ошибки операционной системы** — коды на `E`: `ENOENT`, `EADDRINUSE`.
  У них есть также `syscall` и `errno` (номер ошибки в ОС);
- **ошибки самого Node.js** — коды на `ERR_`: `ERR_MODULE_NOT_FOUND`
  (лабораторная 1), `ERR_PARSE_ARGS_UNKNOWN_OPTION` (лабораторная 2).

Вид ошибки проверяют по `error.code`, а не по тексту `error.message`:
текст может поменяться в новой версии Node.js, а код — нет.

### 1.4. `try / catch / finally`

```js
try {
  const data = JSON.parse(text); // может выбросить SyntaxError
  use(data);
} catch (error) {
  console.error(`Bad input: ${error.message}`);
} finally {
  cleanup(); // выполнится всегда: и после успеха, и после ошибки, и после return
}
```

- `catch (error)` получает выброшенный объект. Если он не нужен, можно
  писать просто `catch { ... }`.
- `finally` выполняется **всегда** — после успеха, после ошибки, даже если
  в `try` был `return`. В нём освобождают ресурсы: закрывают файл,
  останавливают таймер.
- Не пишите `return` внутри `finally`: он «съест» ошибку из `try`, и она
  пропадёт бесследно.

`JSON.parse(text)` превращает строку в формате JSON в значение JavaScript:
`JSON.parse('{"a":1}')` даёт `{ a: 1 }`, а на неправильной строке
(`'not json'`) выбрасывает `SyntaxError`. `'null'` — тоже правильный JSON,
его результат `null`. Подробно о JSON — в лабораторной 6.

### Разминка 1

Что напечатает код и в каком порядке?

```js
function inner() {
  try {
    console.log('A');
    throw new Error('boom');
  } finally {
    console.log('B');
  }
}
try {
  inner();
  console.log('C');
} catch (error) {
  console.log(`D ${error.message}`);
} finally {
  console.log('E');
}
console.log('F');
```

### 1.5. Настоящие ошибки: чтение файла

```js
import { readFileSync } from 'node:fs';

const text = readFileSync('notes.txt', 'utf8'); // содержимое файла строкой
```

- второй аргумент `'utf8'` — кодировка. Без него вернётся `Buffer` (байты),
  и `.length` посчитает байты, а не символы;
- суффикс `Sync` значит «синхронно»: функция ждёт, пока файл прочитается,
  и при ошибке **выбрасывает** исключение. Поэтому её можно обернуть
  в `try/catch`. Асинхронные версии появятся в лабораторной 4.

**Разобранный пример.** [solution/read-file.js](solution/read-file.js)
печатает код ошибки, системный вызов и понятное сообщение:

```
$ node read-file.js missing.txt
code=ENOENT syscall=open
Error: File "missing.txt" does not exist

$ node read-file.js .
code=EISDIR syscall=read
Error: "." is a folder, not a file
```

Человеческое сообщение выбирают по `error.code` через `switch`:

```js
function describeReadError(error, path) {
  switch (error.code) {
    case 'ENOENT':
      return `File "${path}" does not exist`;
    case 'EISDIR':
      return `"${path}" is a folder, not a file`;
    default:
      return `Cannot read "${path}": ${error.message}`; // неизвестное — как есть
  }
}
```

Частые коды:

| код            | значит                                               |
| -------------- | ---------------------------------------------------- |
| `ENOENT`       | нет такого файла или папки                           |
| `EACCES`       | нет прав                                             |
| `EPERM`        | операция запрещена (в Windows часто вместо `EACCES`) |
| `EISDIR`       | ожидали файл, а это папка                            |
| `EADDRINUSE`   | порт уже занят                                       |
| `ECONNREFUSED` | по этому адресу никто не принимает подключения       |
| `ETIMEDOUT`    | время ожидания истекло                               |
| `ENOTFOUND`    | имя хоста не найдено (DNS)                           |

### Разминка 2

1. `readFileSync('notes.txt')` без второго аргумента вернул что-то, и `.length`
   оказался больше, чем букв в файле. Почему?
2. Почему сообщение для пользователя выбирают по `error.code`, а не
   ищут слово `no such file` в `error.message`?

---

## Занятие 2. Свои ошибки, ожидаемые ошибки и баги

### 2.1. Ожидаемые ошибки и баги

|             | ожидаемая ошибка                                   | баг                                         |
| ----------- | -------------------------------------------------- | ------------------------------------------- |
| пример      | порт занят, неверный JSON от клиента               | `TypeError: Cannot read properties of null` |
| кто виноват | внешний мир: пользователь, сеть, другая программа  | программист                                 |
| что делать  | понятное сообщение, продолжить или выйти с кодом 1 | залогировать стек, починить код             |

Главное правило: **ловите только те ошибки, которые умеете обработать.**
Всё остальное пусть летит дальше.

### 2.2. Разобранный пример: свой класс ошибки

Свой класс позволяет отличить «нашу» ожидаемую ошибку от всех остальных:

```js
export class ValidationError extends Error {
  constructor(field, message, options) {
    super(message, options); // options — например { cause }, см. 2.3
    this.name = 'ValidationError'; // иначе в логах будет просто «Error»
    this.field = field; // какое поле не прошло проверку
  }
}
```

`extends Error` значит «новый класс — разновидность `Error`»: у него
есть `message` и `stack`, и `instanceof Error` для него верно. `super(...)`
вызывает конструктор `Error` и обязан стоять до обращения к `this`.
Подробнее о классах — в лабораторной 8.

**Почему нельзя ловить всё подряд.** Функция проверяет пользователя,
но в ней есть баг: для входа `'null'` она падает на `data.name`.

```js
class ValidationError extends Error {}

function parseUser(json) {
  const data = JSON.parse(json);
  if (typeof data.name !== 'string') {
    throw new ValidationError('Name is required');
  }
  return data;
}

try {
  console.log(parseUser('null'));
} catch (error) {
  console.log(`Invalid user: ${error.message}`);
}
```

```
Invalid user: Cannot read properties of null (reading 'name')
```

Выглядит как «пользователь ввёл не то», хотя на самом деле это **баг**
в нашем коде. Добавим одну строку в начало `catch`:

```js
try {
  console.log(parseUser('null'));
} catch (error) {
  if (!(error instanceof ValidationError)) throw error; // не наша — пусть летит дальше
  console.log(`Invalid user: ${error.message}`);
}
```

```
TypeError: Cannot read properties of null (reading 'name')
    at parseUser (file:///.../catchall.js:5:19)
```

Теперь видно, что это `TypeError` и где именно он случился. Баг легко найти
и исправить (`data?.name`, см. [шпаргалку](../js-cheatsheet.md)).

### 2.3. Обёртка ошибки и `cause`

Когда низкоуровневая ошибка ничего не говорит пользователю, её
заворачивают в свою, сохраняя исходную:

```js
throw new Error('Config is broken', { cause: error }); // встроенный Error тоже это умеет
throw new ValidationError(null, 'User must be valid JSON', { cause: error });
```

Так причину печатает наш код из упражнения 4 (`error.cause.name`,
`error.cause.message`). Сам Node.js при неперехваченной ошибке показывает
её в строке `[cause]: ...`.

```
ValidationError: User must be valid JSON
  caused by SyntaxError: Unexpected token 'o', "not json" is not valid JSON
```

Пользователь видит понятное сообщение, а разработчик — причину. Чтобы
`cause` работал в своём классе, конструктор должен передать `options`
в `super(message, options)`, как в 2.2. Иначе причина молча потеряется.

### 2.4. Бросить исключение или вернуть результат?

Не каждая проблема — исключение. В эталонном проекте встречаются оба способа:

- `decode(text)` **выбрасывает** `ProtocolError`. Дальше работать
  с битым сообщением нельзя, а исключение само выходит из всех вложенных проверок;
- `validateText(text)` **возвращает** строку с описанием проблемы или `null`.
  Пустое сообщение — обычная ситуация, а не авария, и проверять результат
  через `if` проще, чем писать `try/catch`.

### 2.5. Граница ошибок

**Зачем.** Сервер обрабатывает сообщения тысяч клиентов. Если одно кривое
сообщение вызовет необработанное исключение, процесс упадёт и отключит **всех**.
Поэтому обработку каждого сообщения оборачивают в **границу ошибок** —
`try/catch`, который логирует проблему и не пускает её дальше.

**Разобранный пример.** [solution/boundary.js](solution/boundary.js) выполняет
четыре задачи; вторая выбрасывает ошибку, третья содержит баг:

```js
tasks.forEach((task, index) => {
  try {
    console.log(`#${index}: ${task()}`);
  } catch (error) {
    failed++;
    console.error(`#${index} failed: ${error.name}: ${error.message}`);
  }
});
```

```
#0: ok
#1 failed: Error: task failed
#2 failed: TypeError: Cannot read properties of null (reading 'length')
#3: ok again
Done, failed: 2 of 4
```

Без `try/catch` первая же ошибка остановит всё: `#3` не выполнится,
процесс упадёт с кодом 1.

Граница ошибок — то место, где **все** ошибки ловить правильно: она
не прячет баги, а логирует их со стеком и не даёт одной задаче уронить
остальные. В сервере чата граница стоит вокруг обработки каждого сообщения
(лабораторная 8).

`try/catch` ловит только то, что выброшено **пока выполняется** код внутри
`try`. Ошибки, которые случатся позже — в таймере, в обработчике события, —
этот `try` уже не поймает. Как быть с ними — в лабораторных 4 и 5. Так же
`server.listen(port)` для занятого порта ничего не выбрасывает сразу:
ошибка придёт позже событием (лабораторная 10).

### Разминка 3

1. В `catch` написано `console.log('Something went wrong')` без всякой проверки.
   Чем это плохо, когда в коде появится опечатка?
2. Функция ищет пользователя по нику. Пользователя нет — это исключение
   или возвращаемое значение `null`? Почему?

---

## Упражнения

Решения лежат в [solution/](solution/). Упражнения 1–2 — к первому занятию,
3–5 — ко второму.

### Упражнение 1. Коды системных ошибок

Напишите `read-file.js <путь>`: прочитать файл через `readFileSync`
и вывести его длину. При ошибке вывести `error.code`, `error.syscall`
и человеческое сообщение для `ENOENT`, `EISDIR` и `EACCES`/`EPERM`,
а для остальных — `error.message`. Код выхода при ошибке — 1.

Проверьте на несуществующем файле, на папке (`.`) и на обычном файле.

### Упражнение 2. `finally`

Напишите `withResource(action)`: печатает `open`, выполняет `action()`
и возвращает её результат, а `close` печатает в любом случае.
Проверьте на успешной функции и на функции, которая бросает исключение.
В каком порядке появились `close` и `result`?

### Упражнение 3. Свой класс ошибки

Напишите класс `ValidationError extends Error` с полем `field` (как в 2.2)
и функцию `parseUser(json)`, которая возвращает `{ name, age }` или выбрасывает
`ValidationError`:

- не JSON — `field: null`;
- нет `name` или это пустая строка — `field: 'name'`;
- `age` не целое неотрицательное число — `field: 'age'`.

Вызовите её в цикле для `'{"name":"Ann","age":30}'`, `'{"name":"Ann","age":-1}'`,
`'{"age":5}'` и `'not json'` и выведите результат или ошибку:

```
OK: { name: 'Ann', age: 30 }
ValidationError (field: age): Age must be a non-negative integer
ValidationError (field: name): Name is required
ValidationError: User must be valid JSON
```

Ловите только `ValidationError`, остальное пробрасывайте. Добавьте во входные
данные строку `'null'` и повторите опыт из 2.2: сначала без проверки
`instanceof`, потом с ней. Исправьте баг через `data?.name`.

### Упражнение 4. Цепочка причин

Доработайте `parseUser`: при неверном JSON оберните `SyntaxError` в
`ValidationError` с `{ cause: error }`, а при выводе ошибки печатайте
и причину (2.3).

### Упражнение 5. Граница ошибок

Есть массив функций-задач: одна возвращает `'ok'`, вторая выбрасывает
`Error`, третья содержит баг `null.length`, четвёртая снова возвращает `'ok'`.
Выполните их все так, чтобы падение одной не мешало остальным,
и в конце выведите `Done, failed: 2 of 4`. Затем уберите `try/catch`
и посмотрите, что стало с процессом и его кодом выхода.

## Типичные ошибки

| что видите                                                                        | почему                                             | что делать                                                    |
| --------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| баг выглядит как «неверный ввод» (`Invalid user: Cannot read properties of null`) | `catch` ловит всё подряд                           | `if (!(error instanceof MyError)) throw error`                |
| ошибка пропала совсем, программа молча делает не то                               | пустой `catch {}`                                  | хотя бы залогировать; ловить только то, что умеете обработать |
| в выводе просто `oops` без стека                                                  | выброшена строка: `throw 'oops'`                   | `throw new Error('oops')`                                     |
| в логе свой класс называется `Error`                                              | в конструкторе не задан `this.name`                | `this.name = 'MyError'`                                       |
| `cause` пустой, хотя передавали                                                   | `super(message)` без `options`                     | `super(message, options)`                                     |
| `ReferenceError: x is not defined` сразу после `try`                              | `const x` объявлен внутри `try`                    | `let x;` до `try`                                             |
| исключение «пропало», функция вернула что-то странное                             | `return` внутри `finally`                          | не возвращать из `finally`                                    |
| сообщение пользователю сломалось после обновления Node.js                         | проверяли текст `error.message`                    | проверять `error.code`                                        |
| `try/catch` не поймал ошибку из `setTimeout` или из события                       | ошибка случилась позже, когда `try` уже закончился | лабораторные 4 и 5: `await` в `try` или граница в обработчике |
| процесс упал со стеком и кодом 1                                                  | исключение никто не поймал                         | ожидаемое — ловить там, где умеете обработать; баг — чинить   |

## Шаг проекта

1. В `main()` из лабораторной 2 в блоке `catch` должна первой строкой стоять
   `if (!(error instanceof UsageError)) throw error;`. Так `UsageError`
   по-прежнему даёт сообщение, usage и код 1, а любая другая ошибка
   пробрасывается: это баг, пусть будет виден стек.

   **Проверка:** временно вставьте в функцию разбора аргументов строку
   `null.length;` и запустите `node server.js --port 5000`. Должен
   появиться стек с `TypeError`, а не `Error: ... Usage: ...`. Уберите строку.

2. Создайте `lib/errors.js` с функцией `export function describeListenError(error, port)`.
   Она понадобится в лабораторной 13, когда сервер начнёт слушать порт,
   а в лабораторной 10 вы проверите её на настоящих ошибках. (В эталоне эта
   функция лежит прямо в `server.js`; отдельный модуль удобнее тем, что его
   можно импортировать откуда угодно, не запуская сервер.) Тексты:

   | `error.code` | результат                                                                     |
   | ------------ | ----------------------------------------------------------------------------- |
   | `EADDRINUSE` | `Port 5000 is already in use. Stop the other process or choose another port.` |
   | `EACCES`     | `No permission to listen on port 5000. Try a port above 1024.`                |
   | любой другой | `Cannot start server on port 5000: <error.message>`                           |

   **Проверка:** создайте рядом временный `check.js`:

   ```js
   import { describeListenError } from './lib/errors.js';
   console.log(describeListenError({ code: 'EADDRINUSE' }, 5000));
   console.log(describeListenError({ code: 'EACCES' }, 80));
   console.log(describeListenError(new Error('boom'), 5000));
   ```

   Запустите `node check.js` из папки `chat/`, сверьте три строки с таблицей
   и удалите файл. Вместо настоящей ошибки здесь передаётся обычный объект
   `{ code: ... }`: функции важно только поле `code`.

Сделайте коммит.

## Контрольные вопросы

1. Что происходит с функциями между местом `throw` и ближайшим `try/catch`?
2. Как читать стек вызовов в сообщении об ошибке?
3. Почему бросают `new Error(...)`, а не строку?
4. Когда выполняется `finally`?
5. Зачем в своём классе ошибки задавать `name`?
6. Что плохого в `catch (error) {}` без проверки типа ошибки?
7. Когда лучше выбросить исключение, а когда вернуть `null` или описание проблемы?
8. Что такое граница ошибок и где она нужна в сервере чата?
9. Что произойдёт с процессом, если исключение никто не поймал?
10. Как Node.js сообщает, что порт занят? Почему `try/catch` вокруг `listen`
    этого не поймает?

Ответы — в [answers.md](answers.md).

## Где это в эталонном проекте

- `ProtocolError` и `decode` в [protocol.js](../../protocol.js) — свой класс ошибки с кодом;
  `validateText` там же — проблема как возвращаемое значение.
- Граница ошибок вокруг обработки сообщения — `handleConnection`
  в [lib/chat-server.js](../../lib/chat-server.js).
- `describeListenError` в [server.js](../../server.js) и `describeConnectError`
  с `AggregateError` в [client.js](../../client.js).
- `git show step-7 --stat` — шаг, на котором появилась обработка ошибок и обрывов.
