import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [script, page, styles, adminPage, adminScript, adminStyles, pwaScript, serviceWorker, manifest, appIcon] = await Promise.all([
  readFile(new URL('../public/store.js', import.meta.url), 'utf8'),
  readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../public/mobile-first.css', import.meta.url), 'utf8'),
  readFile(new URL('../public/admin.html', import.meta.url), 'utf8'),
  readFile(new URL('../public/admin.js', import.meta.url), 'utf8'),
  readFile(new URL('../public/admin-movo.css', import.meta.url), 'utf8'),
  readFile(new URL('../public/pwa.js', import.meta.url), 'utf8'),
  readFile(new URL('../public/service-worker.js', import.meta.url), 'utf8'),
  readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'),
  readFile(new URL('../public/icons/icon-512.svg', import.meta.url), 'utf8'),
]);

test('catalog includes casual and training products', () => {
  assert.equal((script.match(/category: '(?:Casual|Treino)'/g) ?? []).length, 8);
  assert.match(script, /let filters = \['Tudo', 'Casual', 'Treino'\]/);
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
  assert.match(script, /cart\.push\(\{ product: selectedProduct, size: selectedSize, qty: 1/);
  assert.match(script, /cart\.reduce\(\(total, item\) => total \+ \(item\.priceOnRequest \? 0 : cartItemPriceCents\(item\) \* item\.qty\), 0\)/);
  assert.match(script, /wa\.me\/\$\{phone\}\?text=/);
});

test('mobile styles provide touch sized controls and a two column product grid', () => {
  assert.match(styles, /\.products\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.size-option\{min-height:54px/);
  assert.match(styles, /prefers-reduced-motion/);
});

test('admin can edit store identity and homepage appearance', () => {
  assert.match(adminPage, /data-admin-tab="appearance"/);
  assert.match(adminPage, /id="appearance-settings"/);
  assert.match(adminPage, /id="hero-image"/);
  assert.match(adminPage, /id="favicon-image"/);
  assert.match(adminPage, /class="brand-upload-card"/);
  assert.match(adminScript, /appearance-form/);
  assert.match(adminScript, /function setActiveTab/);
  assert.match(script, /loadStoreCatalog/);
  assert.match(script, /catalog\.catalogManaged/);
  assert.match(script, /restaurant\.faviconUrl/);
  assert.match(adminStyles, /::file-selector-button/);
  assert.match(adminStyles, /system-ui/);
  assert.match(adminStyles, /grid-template-rows:auto 190px auto/);
});

test('store displays the administrator catalog instead of stale demo items', () => {
  assert.match(script, /catalog\.catalogManaged/);
  assert.match(script, /mapCatalogProducts\(catalog\)/);
  assert.match(script, /catalog\.products\.filter\(\(product\) => product\.available !== false\)/);
  assert.match(script, /escapeHtml\(product\.name\)/);
  assert.match(script, /store-delivery-info/);
});

test('PWA setup registers updates without deleting browser caches', () => {
  assert.match(pwaScript, /serviceWorker\.register\('\/service-worker\.js'\)/);
  assert.doesNotMatch(pwaScript, /serviceWorker\.unregister|caches\.delete/);
  assert.match(serviceWorker, /movo-shell-v14/);
  assert.match(serviceWorker, /store\.js\?v=20261030-8/);
  assert.match(manifest, /icons\/icon-192\.png/);
  assert.match(manifest, /icons\/icon-512\.png/);
  assert.match(appIcon, /#c8f169/);
  assert.doesNotMatch(appIcon, /Sabor Brasileiro|>SB</);
});
