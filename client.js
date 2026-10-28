// Точка входа клиента: разбирает аргументы, подключается к серверу
// и запускает чат. Сама логика — в lib/chat-client.js, интерфейс — в lib/terminal-ui.js.

import { ChatClient } from './lib/chat-client.js';
import { UsageError, parseOptions, parsePort, requireOption } from './lib/cli.js';
import { TerminalUI } from './lib/terminal-ui.js';
import { NICK_RULES, isValidNick } from './protocol.js';
import * as transport from './transport/index.js';

const USAGE = [
  'Usage: node client.js --host <address> --port <1-65535> --nick <nickname>',
  `  nickname: ${NICK_RULES}`,
  'Example: node client.js --host 192.168.1.10 --port 5000 --nick alice',
].join('\n');

function parseClientArgs() {
  const values = parseOptions({
    host: { type: 'string' },
    port: { type: 'string' },
    nick: { type: 'string' },
  });

  const host = requireOption(values, 'host');
  const port = parsePort(requireOption(values, 'port'));
  const nick = requireOption(values, 'nick');
  if (!isValidNick(nick)) {
    throw new UsageError(`Invalid nickname "${nick}"`);
  }
  return { host, port, nick };
}

async function main() {
  let options;
  try {
    options = parseClientArgs();
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`Error: ${error.message}\n${USAGE}`);
    process.exitCode = 1;
    return;
  }

  const { host, port, nick } = options;

  let connection;
  try {
    connection = await transport.connect({ host, port });
  } catch (error) {
    console.error(`Cannot connect to ${host}:${port}: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Connected to ${connection.remoteAddress}`);

  const client = new ChatClient({ connection, ui: new TerminalUI(), nick });
  await client.run();
}

main();
