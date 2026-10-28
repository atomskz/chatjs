// Упражнение 1: одни и те же тесты для каждой реализации контракта.

import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { createFileStore, createMemoryStore } from './stores.js';

const folder = await mkdtemp(join(tmpdir(), 'store-'));
after(() => rm(folder, { recursive: true, force: true }));

const implementations = {
  memory: () => createMemoryStore(),
  file: () => createFileStore(join(folder, `${Math.random()}.json`)),
};

for (const [name, create] of Object.entries(implementations)) {
  describe(`${name} store`, () => {
    test('returns undefined for a missing key', async () => {
      assert.equal(await create().get('nope'), undefined);
    });

    test('returns what was set', async () => {
      const store = create();
      await store.set('nick', 'ann');
      assert.equal(await store.get('nick'), 'ann');
    });

    test('overwrites a value', async () => {
      const store = create();
      await store.set('nick', 'ann');
      await store.set('nick', 'bob');
      assert.equal(await store.get('nick'), 'bob');
    });
  });
}
