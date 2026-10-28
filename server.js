// Точка входа сервера: разбирает аргументы и связывает транспорт
// с логикой чата. Сама логика — в lib/chat-server.js.

import { ChatServer } from './lib/chat-server.js';
import { UsageError, parseOptions, parsePort, requireOption } from './lib/cli.js';
import * as transport from './transport/index.js';

const USAGE = 'Usage: node server.js --port <1-65535>';

function parseServerArgs() {
  const values = parseOptions({
    port: { type: 'string' },
  });
  return {
    port: parsePort(requireOption(values, 'port')),
  };
}

function createLogger() {
  const line = (level, text) => `${new Date().toISOString()} ${level.padEnd(5)} ${text}`;
  return {
    info: (text) => console.log(line('INFO', text)),
    warn: (text) => console.warn(line('WARN', text)),
    error: (text) => console.error(line('ERROR', text)),
  };
}

function describeListenError(error, port) {
  switch (error.code) {
    case 'EADDRINUSE':
      return `Port ${port} is already in use. Stop the other process or choose another port.`;
    case 'EACCES':
      return `No permission to listen on port ${port}. Try a port above 1024.`;
    default:
      return `Cannot start server on port ${port}: ${error.message}`;
  }
}

async function main() {
  let options;
  try {
    options = parseServerArgs();
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`Error: ${error.message}\n${USAGE}`);
    process.exitCode = 1;
    return;
  }

  const logger = createLogger();
  const chat = new ChatServer({ logger });

  let server;
  try {
    server = await transport.listen({
      port: options.port,
      onConnection: (connection) => chat.handleConnection(connection),
    });
  } catch (error) {
    console.error(`Error: ${describeListenError(error, options.port)}`);
    process.exitCode = 1;
    return;
  }
  logger.info(`Server listening on port ${server.port}`);
}

main();
