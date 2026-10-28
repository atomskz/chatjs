// Общие помощники для разбора аргументов командной строки.

import { parseArgs } from 'node:util';

/** Ошибка в аргументах: показываем сообщение и подсказку по использованию. */
export class UsageError extends Error {}

/**
 * Обёртка над util.parseArgs, которая превращает любые ошибки разбора
 * (неизвестный флаг, флаг без значения) в UsageError.
 */
export function parseOptions(options) {
  try {
    return parseArgs({ options, strict: true, allowPositionals: false }).values;
  } catch (error) {
    throw new UsageError(error.message);
  }
}

export function requireOption(values, name) {
  const value = values[name];
  if (value === undefined || value === '') {
    throw new UsageError(`Option --${name} is required`);
  }
  return value;
}

export function parsePort(value) {
  const port = Number(value);
  if (!/^\d+$/.test(value) || port < 1 || port > 65535) {
    throw new UsageError(`Port must be an integer from 1 to 65535, got "${value}"`);
  }
  return port;
}
