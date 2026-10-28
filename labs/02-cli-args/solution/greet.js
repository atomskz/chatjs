// Упражнение 2: разбор аргументов через util.parseArgs.
// Пример: node greet.js --name Ann --times 2 --shout

import { parseArgs } from 'node:util';

const USAGE = 'Usage: node greet.js --name <name> [--times <1-10>] [--shout]';

class UsageError extends Error {}

function parseTimes(value) {
  const times = Number(value);
  if (!/^\d+$/.test(value) || times < 1 || times > 10) {
    throw new UsageError(`--times must be an integer from 1 to 10, got "${value}"`);
  }
  return times;
}

function parseGreetArgs(args) {
  let values;
  try {
    ({ values } = parseArgs({
      args,
      options: {
        name: { type: 'string' },
        times: { type: 'string', default: '1' },
        shout: { type: 'boolean', short: 's', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      strict: true,
    }));
  } catch (error) {
    // Неизвестный флаг, флаг без значения, лишний аргумент.
    throw new UsageError(error.message);
  }

  if (values.help) {
    return { help: true };
  }
  if (!values.name) {
    throw new UsageError('Option --name is required');
  }
  return { name: values.name, times: parseTimes(values.times), shout: values.shout };
}

function main() {
  let options;
  try {
    options = parseGreetArgs(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`Error: ${error.message}\n${USAGE}`);
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    console.log(USAGE);
    return;
  }

  const greeting = `Hello, ${options.name}!`;
  for (let i = 0; i < options.times; i++) {
    console.log(options.shout ? greeting.toUpperCase() : greeting);
  }
}

main();
