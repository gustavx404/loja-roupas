import { createStore } from '../src/store.mjs';

if (process.env.NODE_ENV !== 'production' && process.env.SUPABASE_URL == null) {
  try { process.loadEnvFile('.env'); } catch { /* Environment may already be configured. */ }
}

const categories = [
  { id: 'casual', name: 'Casual' },
  { id: 'treino', name: 'Treino' },
];

const sourceProducts = [
  ['camiseta-move', 'casual', 'Camiseta Move', 'Algodão macio · Areia', 8900, '/images/products/tee.webp', ['P', 'M', 'G', 'GG']],
  ['regata-flow', 'treino', 'Regata Flow', 'Dry fit · Verde sálvia', 7900, '/images/products/tank.webp', ['P', 'M', 'G', 'GG']],
  ['short-pace', 'treino', 'Short Pace', 'Leve e flexível · Grafite', 11900, '/images/products/shorts.webp', ['P', 'M', 'G', 'GG']],
  ['moletom-relax', 'casual', 'Moletom Relax', 'Algodão confortável · Caramelo', 19900, '/images/products/tee.webp', ['P', 'M', 'G', 'GG']],
  ['top-flow', 'treino', 'Top Flow', 'Tecido elástico · Terracota', 9900, '/images/products/top.webp', ['P', 'M', 'G']],
  ['calca-move', 'casual', 'Calça Move', 'Moletinho leve · Preto', 18900, '/images/products/shorts.webp', ['P', 'M', 'G', 'GG']],
  ['camiseta-pace', 'treino', 'Camiseta Pace', 'Secagem rápida · Oliva', 9900, '/images/products/tank.webp', ['P', 'M', 'G', 'GG']],
  ['short-everyday', 'casual', 'Short Everyday', 'Conforto todo dia · Natural', 12900, '/images/products/shorts.webp', ['P', 'M', 'G', 'GG']],
];

try {
  if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error('Configure SUPABASE_URL e a chave secreta do Supabase no .env.');
  }

  const store = await createStore();
  const current = await store.getCatalog();
  if (current.catalogManaged || current.categories.length || current.products.length) {
    throw new Error('O catálogo já contém dados. Nada foi alterado.');
  }

  const products = sourceProducts.map(([id, categoryId, name, description, priceCents, imageUrl, sizes]) => ({
    id,
    categoryId,
    name,
    description,
    priceCents,
    priceOnRequest: false,
    imageUrl,
    available: true,
    modifierGroups: [{
      id: `size-${id}`,
      name: 'Tamanho',
      required: true,
      options: sizes.map((size) => ({ id: `${id}-${size.toLowerCase()}`, name: size, priceCents: 0, available: true })),
    }],
    removals: [],
  }));

  await store.saveCatalog({ ...current, categories, products, catalogManaged: true });
  console.log(`Catálogo inicial publicado: ${products.length} produtos, ${categories.length} categorias.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
