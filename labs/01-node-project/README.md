# Лабораторная 1. Проект на Node.js: npm, модули, скрипты

**Цель:** научиться создавать проект на Node.js с нуля: описать его
в `package.json`, разбить код на модули, подключить чужие пакеты
и настроить инструменты, которые следят за качеством кода.

**Понадобится:** лабораторная 0 (или уверенная работа с терминалом и git),
Node.js 22.13 или новее (лучше 24 LTS), редактор кода.
Если в примерах встретится незнакомая запись (`?.`, `??`, деструктуризация,
`...`), загляните в [шпаргалку по синтаксису](../js-cheatsheet.md).
Упражнения делайте в папке `~/js-labs/sandbox-01`.

**Примерное время:** 3–4 часа, два занятия.

**Как работать:** каждый пример повторяйте у себя и сверяйте вывод.
В разминках сначала запишите **свой** ответ, потом проверьте и только
потом смотрите [answers.md](answers.md).

---

## Занятие 1. Проект и модули

### 1.1. Зачем

В лабораторной 0 программа была одним файлом. Настоящие программы — это
десятки файлов, чужие библиотеки и инструменты, которые проверяют код.
Всё это нужно как-то описать, чтобы проект можно было отдать другому
человеку, а он одной командой поставил то же самое и запустил.

**Аналогия: рецепт.** `package.json` — карточка рецепта: название блюда,
список ингредиентов (зависимостей) и шаги приготовления (скрипты).
Сами продукты в карточку не кладут — их покупают по списку. Так же
и чужие пакеты не хранят в проекте: их скачивают по списку из `package.json`.

### 1.2. Node.js и `process`

Вместо `window` и `document` из браузера в Node.js есть глобальный объект
`process` — сведения о текущей программе:

```js
process.version; // версия Node.js, например 'v24.19.0'
process.platform; // 'win32', 'linux', 'darwin'
process.argv; // аргументы командной строки (лабораторная 2)
process.env; // переменные окружения
process.cwd(); // текущая папка
```

### 1.3. Разобранный пример: первый проект

**Шаг 1.** Создайте папку и файл проекта:

```bash
mkdir -p ~/js-labs/sandbox-01
cd ~/js-labs/sandbox-01
npm init -y
```

npm напечатает созданный `package.json`:

```json
{
  "name": "sandbox-01",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs"
}
```

**Шаг 2.** Откройте `package.json` в редакторе и **замените**
`"type": "commonjs"` на `"type": "module"`. Не добавляйте второе поле
`type`: при двух одинаковых ключах действует последний, и `import`
перестанут работать. Добавьте `"private": true` и
`"engines": { "node": ">=22.13" }`.

**Шаг 3.** Создайте `hello.js`:

```js
console.log(`Node.js ${process.version} on ${process.platform}`);
```

**Шаг 4.** Добавьте в `scripts` строку `"hello": "node hello.js"` и запустите:

```
$ npm run hello

> sandbox-01@1.0.0 hello
> node hello.js

Node.js v24.19.0 on win32
```

Строки с `>` печатает сам npm: какой скрипт он запускает и какую команду
выполняет. Последняя строка — вывод вашей программы.

### 1.4. Поля `package.json`

| поле              | зачем                                                   |
| ----------------- | ------------------------------------------------------- |
| `name`, `version` | имя и версия проекта                                    |
| `type`            | `"module"` — файлы `.js` считаются ES-модулями          |
| `private`         | `true` — защита от случайной публикации в npm           |
| `engines`         | какая версия Node.js нужна, например `{"node": ">=22"}` |
| `scripts`         | короткие команды: `npm run lint`, `npm test`            |
| `dependencies`    | пакеты, нужные программе для работы                     |
| `devDependencies` | пакеты, нужные только разработчику (линтер, тесты)      |

- Без `"type": "module"` (или с `"commonjs"`) файлы `.js` считаются
  старым форматом CommonJS (о нём ниже). Расширение файла сильнее поля
  `type`: `.mjs` — всегда ES-модуль, `.cjs` — всегда CommonJS.
- `engines` — подсказка, а не запрет: при неподходящей версии npm только
  предупредит, но установит пакеты.
- Поля `main`, `keywords`, `author`, `license` важны для пакетов, которые
  публикуют в npm. Для своего проекта их можно удалить или не трогать.

### 1.5. Модули: один файл — одна тема

**Зачем.** Когда весь код в одном файле, в нём трудно ориентироваться,
а одну и ту же функцию нельзя использовать в двух программах. Поэтому код
разбивают на **модули**: каждый файл — отдельная тема, а другие файлы
берут из него то, что им нужно.

**Разобранный пример.** Было:

```js
// main.js — всё в одном файле
function sum(a, b) {
  return a + b;
}
console.log(sum(2, 3));
```

Стало — функция в своём модуле:

```js
// math.js
export function sum(a, b) {
  return a + b;
}
export const PI = 3.14159;
```

```js
// main.js
import { sum, PI } from './math.js'; // расширение .js обязательно
console.log(sum(2, 3), PI); // 5 3.14159
```

- Каждый файл — отдельный модуль со своей областью видимости. Наружу видно
  **только** то, что помечено `export`. Всё остальное — внутреннее дело модуля.
- `import { ... } from './math.js'` берёт из модуля нужные имена.
  `./` значит «в этой же папке».

**Именованный экспорт и экспорт по умолчанию.** У модуля может быть сколько
угодно именованных экспортов и один экспорт по умолчанию:

```js
// greet.js
export function hello(name) {} // именованный
export default function greet(name) {} // по умолчанию — не больше одного на модуль
```

```js
import greet, { hello } from './greet.js'; // default — без скобок, любое имя
import { hello as sayHello } from './greet.js'; // переименовать именованный
import * as greetModule from './greet.js'; // всё сразу: greetModule.hello, greetModule.default
```

Именованный экспорт импортируют в `{}` **ровно** под тем именем, под которым
его экспортировали: `import { Sum }` вместо `{ sum }` — ошибка. В этом
проекте почти везде используются именованные экспорты: их имена видны
сразу, и редактор подсказывает их.

**Почему нужно расширение.** ES-модули ищут файл по строке импорта, как
браузер по адресу: ровно по тому пути, который написан. Node.js не
подбирает расширение и не ищет `index.js` в папке, как это делал старый
`require`.

**Встроенные модули и пакеты.**

```js
import os from 'node:os'; // встроенный модуль Node.js
import { readFile } from 'node:fs/promises'; // встроенный, именованный экспорт
import { WebSocket } from 'ws'; // пакет из node_modules — по имени, без пути
```

Префикс `node:` гарантирует, что загрузится именно встроенный модуль,
даже если в `node_modules` есть пакет с таким же именем. Некоторые новые
модули (`node:test`) существуют только с префиксом.

**CommonJS.** В старом коде и в примерах из интернета вы встретите другой
формат: `const fs = require('fs')` и `module.exports = ...`. В ES-модулях
`require`, `__dirname` и `__filename` не определены. Вместо двух последних
есть `import.meta.dirname` и `import.meta.filename`.

### Разминка 1

Создайте `math.js` из примера и для каждой строки ниже предскажите, что
случится при `node main.js`, затем проверьте:

1. `import { sum } from './math';`
2. `import { Sum } from './math.js';`
3. `const fs = require('node:fs');`
4. Всё правильно, но в `package.json` осталось `"type": "commonjs"`.

---

## Занятие 2. Зависимости и инструменты качества

### 2.1. Зависимости

**Зачем.** Писать всё самому не нужно: для WebSocket, тестов, проверки
кода уже есть готовые пакеты. Их публикуют в реестре npm, а `npm install`
скачивает их в проект.

```bash
npm install ws          # пакет для работы программы → dependencies
npm install -D eslint   # пакет только для разработки → devDependencies
```

Что при этом происходит:

```
package.json            npm install           package-lock.json        node_modules/
"ws": "^8.22.0"   ────────────────────►   ws 8.22.0 (точно)   ───►   ws/ (сами файлы)
(что хотим)                                (что поставили)           (то, что запускается)
```

- `package.json` хранит **пожелание**: `"^8.22.0"`. Значок `^` разрешает
  более новые версии 8.x.x, но не 9.0.0 — в мажорной версии могут быть
  несовместимые изменения.
- `package-lock.json` хранит **точные** версии всего, что поставлено, включая
  зависимости зависимостей. Его коммитят в git: команда `npm ci` поставит
  по нему ровно то же самое у другого человека или на сервере.
- `node_modules/` — сами файлы пакетов. Их в git **не кладут**: папка большая,
  и её всегда можно восстановить. Добавьте её в `.gitignore`.

### 2.2. Скрипты

```json
"scripts": {
  "lint": "eslint .",
  "test": "node --test"
}
```

`npm run lint` выполняет строку из `scripts.lint`. Для `test` и `start`
слово `run` можно не писать: `npm test`. Пока выполняется скрипт, npm
добавляет в путь поиска программ папку `node_modules/.bin`. Туда попадают
команды установленных пакетов, поэтому внутри скрипта `eslint` находится.
В обычном терминале просто `eslint .` не сработает («command not found»):
там пишут `npx eslint .`.

Скрипты — общий язык команды: каждому, кто открыл проект, достаточно
знать `npm test` и `npm run lint`, а не помнить длинные команды с флагами.

### 2.3. Линтер и форматтер

**Зачем.** Человек легко пропускает опечатку в имени переменной или
переменную, которую объявил и забыл. А в команде ещё и спорят, где ставить
пробелы и кавычки. Два инструмента снимают обе проблемы:

- **ESLint** ищет ошибки: неиспользуемые переменные, опечатки в именах,
  недостижимый код. Отвечает на вопрос «нет ли здесь ошибки?».
- **Prettier** приводит оформление к единому виду: отступы, кавычки, переносы.
  Отвечает на вопрос «одинаково ли оформлен код?».

**Разобранный пример.** Испорченный `math.js`:

<!-- prettier-ignore -->
```js
export function sum(a, b) {
      const unused = 42;
  return a + b;
}

export function average(numbers) {
  if (numbers.length === 0) {
  return 0;
  }
  return numbers.reduce(sum, 0) / numbrs.length
}
```

`npm run lint`:

```
math.js
   2:13  error  'unused' is assigned a value but never used  no-unused-vars
  10:35  error  'numbrs' is not defined                      no-undef

✖ 2 problems (2 errors, 0 warnings)
```

Каждая строка — место (`строка:символ`), текст и имя правила. `npm run format`
исправит отступы и поставит точку с запятой, но `unused` и `numbrs` останутся:
это ошибки смысла, а не оформления, и решать их вам.

**Настройка ESLint** лежит в `eslint.config.js`. Это массив объектов
настроек, и каждый следующий уточняет предыдущие:

- `js.configs.recommended` — базовый набор правил от авторов ESLint.
  Отсюда берутся, например, `no-unused-vars` и `no-undef`;
- `sourceType: 'module'` — файлы являются ES-модулями (`import`/`export`);
- `globals: globals.node` — список глобальных имён Node.js: `process`,
  `console`, `setTimeout`... Без него ESLint напишет `'process' is not defined`
  и `'console' is not defined` на каждой строке.

**Prettier**: `prettier --write .` переписывает файлы, а `prettier --check .`
только проверяет и завершается с ненулевым кодом, если что-то оформлено
не так. Вторую команду запускают в CI.

**Синтаксическая ошибка** останавливает оба инструмента. Сначала они
разбирают текст программы в дерево (что здесь функция, что переменная),
и только потом проверяют правила или печатают код заново. Если код не
разбирается, дерева нет, и оба сообщают «Parsing error» и останавливаются.

### Разминка 2

1. Коллега склонировал ваш проект, а в нём нет `node_modules/`. Какой
   командой он получит ровно те же версии пакетов, что у вас?
2. В `package.json` написано `"ws": "^8.22.0"`. Может ли npm поставить
   версию 8.25.1? А 9.0.0?
3. ESLint ругается `'process' is not defined`. Что не так с настройкой?

---

## Упражнения

Решения лежат в [solution/](solution/). Упражнения 1–2 — к первому занятию,
3–4 — ко второму.

### Упражнение 1. Первый проект

Повторите разобранный пример 1.3 и доработайте `hello.js`: пусть он выводит
версию Node.js, платформу, текущую папку и `process.argv`.

**Проверка:** `npm run hello` печатает строку вида `Node.js v24.19.0 on win32`.

### Упражнение 2. Модули

1. Создайте `math.js` с функциями `sum(a, b)` и `average(numbers)`.
   Функция `average` должна использовать `sum`.
2. Создайте `main.js`: импортируйте обе функции, а также `os`
   из `node:os`, и выведите `average([2, 4, 9])` и `os.cpus().length`.
3. Выведите `import.meta.dirname` и `import.meta.filename`.
4. Проделайте все четыре поломки из разминки 1 и прочитайте каждую ошибку.

**Проверка:** `node main.js` печатает `average: 5` и число ядер процессора.

### Упражнение 3. Зависимости

1. Выполните `npm install ws` и `npm install -D eslint @eslint/js globals prettier`.
2. Посмотрите, как изменились `package.json` и `node_modules/`, и найдите
   `ws` в `package-lock.json`.
3. Создайте `.gitignore` со строкой `node_modules/`.
4. Удалите `node_modules/` (`rm -rf node_modules` в bash,
   `Remove-Item -Recurse -Force node_modules` в PowerShell) и выполните
   `npm ci`. Папка восстановится в точности по `package-lock.json`.

### Упражнение 4. ESLint и Prettier

1. Создайте `eslint.config.js`:

   ```js
   import js from '@eslint/js';
   import globals from 'globals';

   export default [
     js.configs.recommended,
     {
       languageOptions: {
         ecmaVersion: 'latest',
         sourceType: 'module',
         globals: globals.node,
       },
     },
   ];
   ```

2. Создайте `.prettierrc.json`: `{ "singleQuote": true, "printWidth": 100 }`.
3. Добавьте скрипты `"lint": "eslint ."`, `"format": "prettier --write ."`
   и `"format:check": "prettier --check ."`.
4. Испортите `math.js`, как в примере 2.3, запустите `npm run lint`, затем
   `npm run format` и снова `npm run lint`. Какие проблемы исправил Prettier,
   а какие остались для вас?
5. Теперь сделайте синтаксическую ошибку, например `retrun a + b;`.
   Что скажут ESLint и Prettier? Почему ни один из них не может продолжить работу?
6. Временно удалите строку `globals: globals.node` и запустите `npm run lint`.
   Верните строку.

## Типичные ошибки

| что видите                                                                                      | почему                                                       | что делать                                                          |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `SyntaxError: Cannot use import statement outside a module`                                     | в `package.json` нет `"type": "module"` или там `"commonjs"` | `"type": "module"` (одно поле, без дубля)                           |
| `ERR_MODULE_NOT_FOUND ... Did you mean to import "./math.js"?`                                  | в `import` нет расширения `.js`                              | `'./math.js'`                                                       |
| `does not provide an export named 'Sum'`                                                        | имя в `{}` не совпадает с экспортом (регистр важен)          | взять точное имя или `{ sum as Sum }`                               |
| `ReferenceError: require is not defined in ES module scope`                                     | код в стиле CommonJS в ES-модуле                             | `import ... from '...'`                                             |
| `npm error Missing script: "hello"`                                                             | такого скрипта нет в `package.json` или вы в другой папке    | проверить `scripts` и `pwd`                                         |
| `npm error code ENOENT ... package.json`                                                        | npm запущен вне папки проекта                                | `cd` в папку, где лежит `package.json`                              |
| `eslint: command not found`                                                                     | пакет установлен в проект, а не в систему                    | `npm run lint` или `npx eslint .`                                   |
| ESLint: `'process' is not defined`, `'console' is not defined`                                  | в настройке нет `globals: globals.node`                      | добавить `globals` в `eslint.config.js`                             |
| `npm ci can only install packages when your package.json and package-lock.json ... are in sync` | `package.json` правили руками, а lock не обновили            | `npm install`, затем закоммитить оба файла                          |
| в Windows `prettier --check` ругается на каждый файл                                            | git превратил переводы строк в CRLF                          | `.gitattributes` с `* text=auto eol=lf` (шаг проекта)               |
| PowerShell: «выполнение сценариев отключено в этой системе»                                     | политика PowerShell запрещает `npm.ps1`                      | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` или `npm.cmd` |

## Шаг проекта

Начните свой чат: в отдельной папке `~/js-labs/chat/` (не внутри этого
репозитория) сделайте то же, что в упражнениях 1, 3 и 4:

- `package.json` с `"type": "module"`, `engines` и зависимостью `ws`;
- ESLint, Prettier и скрипты `lint`, `format`, `format:check`;
- `.gitignore` с `node_modules/`;
- `.gitattributes` со строкой `* text=auto eol=lf`. В Windows git может
  превращать переводы строк в CRLF, и тогда Prettier ругается на каждый файл;
- `git init` и первый коммит.

**Проверка:** `npm run lint` и `npm run format:check` проходят без ошибок,
`git log --oneline` показывает один коммит, а `git status` — что
`node_modules/` не попал в репозиторий.

Дальше каждая лабораторная добавляет в этот проект новый кусок,
а в лабораторной 15 он становится готовым чатом. Удобно делать по коммиту
на каждую лабораторную.

## Контрольные вопросы

1. Что описывает `package.json` и почему чужие пакеты не хранят в самом проекте?
2. Чем `dependencies` отличаются от `devDependencies`?
3. Зачем коммитить `package-lock.json` и почему не коммитят `node_modules/`?
4. Что меняет `"type": "module"` в `package.json`?
5. Почему в `import` нужно писать `./math.js`, а не `./math`?
6. Чем именованный экспорт отличается от экспорта по умолчанию?
7. Зачем писать `node:fs`, а не просто `fs`?
8. Какую проблему решает ESLint, а какую Prettier? Можно ли обойтись одним?

Ответы — в [answers.md](answers.md).

## Где это в эталонном проекте

- [package.json](../../package.json), [eslint.config.js](../../eslint.config.js),
  [.prettierrc.json](../../.prettierrc.json), [.gitattributes](../../.gitattributes).
- Каким был эталон на этом шаге: `git show step-0 --stat` (как смотреть историю
  эталона, см. [labs/README.md](../README.md#история-эталонного-проекта)).
