// Интерфейс клиента в терминале: строка ввода и вывод сообщений над ней.
// Ничего не знает ни о сети, ни о протоколе — только как показать текст.
//
// События:
//   'line' (text) — пользователь ввёл строку и нажал Enter
//   'quit'        — пользователь нажал Ctrl+C или Ctrl+D

import { EventEmitter } from 'node:events';
import readline from 'node:readline';
import { styleText } from 'node:util';

const PROMPT = '> ';

function formatTime(ts) {
  const date = new Date(ts);
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

export class TerminalUI extends EventEmitter {
  #rl;
  #output;
  #isClosed = false;

  constructor({ input = process.stdin, output = process.stdout } = {}) {
    super();
    this.#output = output;
    this.#rl = readline.createInterface({ input, output, prompt: PROMPT });

    this.#rl.on('line', (line) => {
      this.#eraseSubmittedLine();
      this.emit('line', line);
      if (!this.#isClosed) this.#rl.prompt();
    });
    this.#rl.on('SIGINT', () => this.emit('quit')); // Ctrl+C в интерактивном терминале
    this.#rl.on('close', () => {
      // Ctrl+D или конец ввода: readline уже закрыт, и rl.prompt() теперь
      // выбросил бы ERR_USE_AFTER_CLOSE. Поднимаем флаг, чтобы дальше
      // печатать просто строками, и сообщаем, что пользователь хочет выйти.
      if (this.#isClosed) return;
      this.#isClosed = true;
      this.emit('quit');
    });

    this.#rl.prompt();
  }

  printChat({ from, text, ts, isOwn }) {
    const author = isOwn ? styleText(['bold', 'green'], 'you') : styleText('bold', from);
    this.#print(`${this.#time(ts)} ${author}: ${text}`);
  }

  printSystem(text, ts = Date.now()) {
    this.#print(`${this.#time(ts)} ${styleText('yellow', `* ${text}`)}`);
  }

  printInfo(text) {
    this.#print(styleText('cyan', text));
  }

  printError(text) {
    this.#print(styleText('red', `! ${text}`));
  }

  close() {
    if (this.#isClosed) return;
    this.#isClosed = true;
    if (this.#output.isTTY) {
      // Убираем висящее приглашение «> », чтобы после выхода не осталось мусора.
      readline.cursorTo(this.#output, 0);
      readline.clearLine(this.#output, 0);
    }
    this.#rl.close();
  }

  #time(ts) {
    return styleText('dim', `[${formatTime(ts)}]`);
  }

  /**
   * Выводит строку НАД строкой ввода, не ломая то, что пользователь набирает.
   * Приём такой: стираем строку с приглашением, печатаем сообщение,
   * а затем readline заново рисует приглашение и набранный текст.
   * Для простоты считаем, что набранный текст помещается в одну строку терминала.
   */
  #print(line) {
    if (this.#isClosed || !this.#output.isTTY) {
      this.#output.write(`${line}\n`);
      return;
    }
    readline.cursorTo(this.#output, 0);
    readline.clearLine(this.#output, 0);
    this.#output.write(`${line}\n`);
    this.#rl.prompt(true); // true — сохранить набранный текст и позицию курсора
  }

  /**
   * После Enter в терминале остаётся строка «> текст». Стираем её:
   * сервер пришлёт это сообщение обратно, и оно появится уже в общей ленте.
   */
  #eraseSubmittedLine() {
    if (!this.#output.isTTY) return;
    readline.moveCursor(this.#output, 0, -1);
    readline.clearLine(this.#output, 0);
  }
}
