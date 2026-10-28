// Точка входа клиента: разбирает аргументы, подключается к серверу
// и запускает чат. Сама логика — в lib/chat-client.js, интерфейс — в lib/terminal-ui.js.

import { ChatClient } from './lib/chat-client.js';
import { UsageError, parseOptions, parsePort, requireOption } from './lib/cli.js';
import { TerminalUI } from './lib/terminal-ui.js';
import { NICK_RULES, isValidNick } from './protocol.js';
import { DEFAULT_TRANSPORT, TRANSPORT_NAMES, getTransport } from './transport/index.js';

const USAGE = [
  `Usage: node client.js --host <address> --port <1-65535> --nick <nickname> [--transport ${TRANSPORT_NAMES.join('|')}]`,
  `  nickname: ${NICK_RULES}`,
  'Example: node client.js --host 192.168.1.10 --port 5000 --nick alice',
].join('\n');

function parseClientArgs() {
  const values = parseOptions({
    host: { type: 'string' },
    port: { type: 'string' },
    nick: { type: 'string' },
    transport: { type: 'string', default: DEFAULT_TRANSPORT },
  });

  const host = requireOption(values, 'host');
  const port = parsePort(requireOption(values, 'port'));
  const nick = requireOption(values, 'nick');
  if (!isValidNick(nick)) {
    throw new UsageError(`Invalid nickname "${nick}"`);
  }
  if (!TRANSPORT_NAMES.includes(values.transport)) {
    throw new UsageError(`Unknown transport "${values.transport}"`);
  }
  return { host, port, nick, transportName: values.transport };
}

function describeConnectError(error) {
  // При подключении к localhost Node.js пробует и IPv4, и IPv6,
  // и тогда ошибки приходят пачкой в AggregateError.
  const code = error.code ?? error.errors?.[0]?.code;
  switch (code) {
    case 'ECONNREFUSED':
      return 'connection refused. Is the server running on this host and port?';
    case 'ETIMEDOUT':
      return 'connection timed out. Check the address and your network.';
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return 'host not found. Check the address.';
    default:
      return error.message;
  }
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

  const { host, port, nick, transportName } = options;
  const transport = getTransport(transportName);

  let connection;
  try {
    connection = await transport.connect({ host, port });
  } catch (error) {
    console.error(`Cannot connect to ${host}:${port}: ${describeConnectError(error)}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Connected to ${connection.remoteAddress}`);

  const client = new ChatClient({ connection, ui: new TerminalUI(), nick });
  // В интерактивном терминале Ctrl+C перехватывает readline (см. TerminalUI).
  // Сюда сигнал попадает, только если ввод перенаправлен, например из файла.
  process.once('SIGINT', () => client.quit());
  process.exitCode = await client.run();
}

main();
