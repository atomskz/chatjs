// Упражнение 1: один контракт, две реализации.
//
// Контракт хранилища:
//   get(key)        → Promise<string | undefined>
//   set(key, value) → Promise<void>

import { readFile, writeFile } from 'node:fs/promises';

export function createMemoryStore() {
  const data = new Map();
  return {
    get: async (key) => data.get(key),
    set: async (key, value) => {
      data.set(key, value);
    },
  };
}

export function createFileStore(path) {
  async function load() {
    try {
      return JSON.parse(await readFile(path, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return {}; // файла ещё нет — хранилище пустое
      throw error;
    }
  }
  return {
    get: async (key) => (await load())[key],
    set: async (key, value) => {
      const data = await load();
      data[key] = value;
      await writeFile(path, JSON.stringify(data));
    },
  };
}
