import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [migration, store, api, gitignore] = await Promise.all([
  readFile(new URL('../supabase/migrations/20261031014638_initial_movo_schema.sql', import.meta.url), 'utf8'),
  readFile(new URL('../src/store.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../src/api.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../.gitignore', import.meta.url), 'utf8'),
]);

test('all public app tables enable RLS and block browser roles', () => {
  for (const table of ['app_catalog', 'administrator', 'administrator_session']) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
  assert.match(migration, /revoke all on public\.app_catalog, public\.administrator, public\.administrator_session from anon, authenticated/i);
});

test('media storage is private and capped to approved image formats at 2 MiB', () => {
  assert.match(migration, /values \('store-media', 'store-media', false, 2097152, array\['image\/jpeg','image\/png','image\/webp'\]\)/i);
  assert.match(api, /const maxImageBytes = 2 \* 1024 \* 1024/);
  assert.match(api, /validImage\(data, contentType\)/);
});

test('Supabase secret is read only by the server adapter and never stored in Git', () => {
  assert.match(store, /SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(store, /NEXT_PUBLIC_SUPABASE_SECRET_KEY/);
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^\.env$/m);
});
