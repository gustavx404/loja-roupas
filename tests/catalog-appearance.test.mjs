import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyCatalog, normalizeCatalog } from '../src/catalog.mjs';

const emptyInput = () => ({ ...emptyCatalog(), restaurant: { ...emptyCatalog().restaurant } });

test('catalog keeps editable store appearance with safe default assets', () => {
  const catalog = normalizeCatalog(emptyInput());
  assert.equal(catalog.restaurant.heroImageUrl, '/images/hero-set.png');
  assert.equal(catalog.restaurant.faviconUrl, '/favicon.svg');
  assert.equal(catalog.restaurant.announcement, 'FRETE GRÁTIS em compras acima de R$ 299');
});

test('catalog accepts uploaded hero and favicon media paths', () => {
  const input = emptyInput();
  input.restaurant.heroImageUrl = '/media/hero-123.webp';
  input.restaurant.faviconUrl = '/media/icon-456.png';
  input.restaurant.heroTitle = 'Vista seu ritmo';
  const catalog = normalizeCatalog(input);
  assert.equal(catalog.restaurant.heroImageUrl, input.restaurant.heroImageUrl);
  assert.equal(catalog.restaurant.faviconUrl, input.restaurant.faviconUrl);
  assert.equal(catalog.restaurant.heroTitle, 'Vista seu ritmo');
});

test('catalog rejects external and traversal paths for brand images', () => {
  const input = emptyInput();
  input.restaurant.heroImageUrl = 'https://example.com/large-image.png';
  assert.throws(() => normalizeCatalog(input), /imagens da loja/);
});
