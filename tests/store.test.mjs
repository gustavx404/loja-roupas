import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [script, page, styles, adminPage, adminScript] = await Promise.all([
  readFile(new URL('../public/store.js', import.meta.url), 'utf8'),
  readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../public/mobile-first.css', import.meta.url), 'utf8'),
  readFile(new URL('../public/admin.html', import.meta.url), 'utf8'),
  readFile(new URL('../public/admin.js', import.meta.url), 'utf8'),
]);

test('catalog includes casual and training products', () => {
  assert.equal((script.match(/category:'(?:Casual|Treino)'/g) ?? []).length, 8);
  assert.match(script, /const filters=\['Tudo','Casual','Treino'\]/);
});

test('size flow uses an accessible dialog and never invokes browser alerts', () => {
  assert.match(page, /<dialog class="size-dialog" id="size-dialog"/);
  assert.match(script, /showModal\(\)/);
  assert.match(script, /aria-pressed/);
  assert.doesNotMatch(script, /\b(?:prompt|alert)\s*\(/);
});

test('store footer exposes the Netlify administrator route', () => {
  assert.match(page, /href="\/admin"/);
  assert.match(page, /Área administrativa/);
});

test('adding a size updates cart state and checkout summary', () => {
  assert.match(script, /cart\.push\(\{product:selectedProduct,size:selectedSize,qty:1\}\)/);
  assert.match(script, /cart\.reduce\(\(s,i\)=>s\+i\.product\.price\*i\.qty,0\)/);
  assert.match(script, /wa\.me\/\$\{storeWhatsapp\}\?text=/);
});

test('mobile styles provide touch sized controls and a two column product grid', () => {
  assert.match(styles, /\.products\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.size-option\{min-height:54px/);
  assert.match(styles, /prefers-reduced-motion/);
});

test('admin can edit store identity and homepage appearance', () => {
  assert.match(adminPage, /href="#appearance-settings"/);
  assert.match(adminPage, /id="appearance-settings"/);
  assert.match(adminPage, /id="hero-image"/);
  assert.match(adminPage, /id="favicon-image"/);
  assert.match(adminScript, /appearance-form/);
  assert.match(script, /loadStoreAppearance/);
  assert.match(script, /restaurant\.faviconUrl/);
});
