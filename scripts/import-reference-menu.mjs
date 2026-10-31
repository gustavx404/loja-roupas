import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from '../src/store.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const branchArgument = process.argv.find((argument) => argument.startsWith('--branch='));
const branch = branchArgument?.slice('--branch='.length);
let connectionString = process.env.NETLIFY_DB_URL;
if (!connectionString && branch) {
  const result = spawnSync(resolve(root, 'node_modules/.bin/netlify'), ['database', 'status', '--branch', branch, '--json', '--show-credentials'], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Não consegui acessar o banco da branch Netlify "${branch}". Verifique login, vínculo e publicação dessa branch.`);
  try { connectionString = JSON.parse(result.stdout.slice(result.stdout.indexOf('{'))).database?.connectionString; }
  catch { throw new Error('O Netlify CLI não retornou uma conexão válida para o banco remoto.'); }
  if (!connectionString) throw new Error(`Não encontrei um banco provisionado para a branch "${branch}".`);
}
if (!connectionString) {
  try { connectionString = JSON.parse(readFileSync(resolve(root, '.netlify/state.json'), 'utf8')).dbConnectionString; }
  catch { /* Netlify CLI fallback below. */ }
}
if (!connectionString) {
  const result = spawnSync(resolve(root, 'node_modules/.bin/netlify'), ['database', 'connect', '--json'], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Inicie `npm run dev` para conectar ao banco local.');
  connectionString = JSON.parse(result.stdout.slice(result.stdout.indexOf('{'))).connection_string;
}

const store = await createStore({ connectionString });
const current = await store.getCatalog();
const categorySpecs = [
  ['lanches', 'Lanches'], ['porcoes', 'Porções'], ['tapiocas-salgadas', 'Tapiocas salgadas'], ['tapiocas-doces', 'Tapiocas doces'],
  ['pasteis-salgados', 'Pastéis salgados'], ['pasteis-doces', 'Pastéis doces'], ['salgados-no-cone', 'Salgados no cone'],
  ['x-calota', 'X-Calota Explosão'], ['pratos-executivos', 'Pratos executivos e marmitas'], ['sucos-naturais', 'Sucos naturais'],
];
const categories = categorySpecs.map(([id, name]) => {
  const existing = current.categories.find((category) => category.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'));
  return { id: existing?.id ?? `ref-${id}`, name };
});
const categoryId = Object.fromEntries(categorySpecs.map(([key], index) => [key, categories[index].id]));
const product = (id, category, name, priceCents, description, image, extra = {}) => ({
  id: `ref-${id}`, categoryId: categoryId[category], name, priceCents, priceOnRequest: false, description,
  imageUrl: `/images/menu-products/${image}.png`, available: true, modifierGroups: [], removals: [], ...extra,
});
const products = [
  product('x-salada', 'lanches', 'X-Salada', 1000, 'Pão, carne, queijo, alface e tomate.', 'x-salada'),
  product('x-burguer', 'lanches', 'X-Burguer', 600, 'Pão, carne e queijo.', 'x-burguer'),
  product('x-salada-duplo', 'lanches', 'X-Salada Duplo', 1500, 'Pão, duas carnes, queijo, alface e tomate.', 'x-salada-duplo'),
  product('x-frango', 'lanches', 'X-Frango', 1500, 'Pão, frango desfiado, queijo, alface e tomate.', 'x-frango'),
  product('x-bacon', 'lanches', 'X-Bacon', 1800, 'Pão, carne, queijo e bacon.', 'x-bacon'),
  product('x-cheddar-bacon', 'lanches', 'X-Cheddar Bacon', 1800, 'Pão, carne, cheddar e bacon.', 'x-cheddar-bacon'),
  product('x-calabresa', 'lanches', 'X-Calabresa', 1800, 'Pão, carne, calabresa, queijo, alface e tomate.', 'x-calabresa'),
  product('x-coracao', 'lanches', 'X-Coração', 1800, 'Pão, carne, coração, queijo, alface e tomate.', 'x-coracao'),
  product('x-cheddar', 'lanches', 'X-Cheddar', 1800, 'Pão, carne, cheddar, alface e tomate.', 'x-cheddar'),
  product('batata-frita', 'porcoes', 'Porção de Batata Frita Simples', 1500, 'Porção de batata frita.', 'batata-frita'),
  product('batata-cheddar-bacon', 'porcoes', 'Batata com Cheddar e Bacon', 2000, 'Porção de batata frita com cheddar e bacon.', 'batata-cheddar-bacon'),
  product('tapioca-carne-cheddar', 'tapiocas-salgadas', 'Carne com Cheddar', 1000, 'Tapioca salgada.', 'tapioca-carne-cheddar'),
  product('tapioca-carne', 'tapiocas-salgadas', 'Carne', 1000, 'Tapioca salgada.', 'tapioca-carne'),
  product('tapioca-frango', 'tapiocas-salgadas', 'Frango', 1000, 'Tapioca salgada.', 'tapioca-frango'),
  product('tapioca-frango-catupiry', 'tapiocas-salgadas', 'Frango com Catupiry', 1000, 'Tapioca salgada.', 'tapioca-frango-catupiry'),
  product('tapioca-calabresa-queijo', 'tapiocas-salgadas', 'Calabresa com Queijo', 1000, 'Tapioca salgada.', 'tapioca-calabresa-queijo'),
  product('tapioca-doce-morango', 'tapiocas-doces', 'Morango com Chocolate', 1299, 'Tapioca doce.', 'tapioca-doce-morango'),
  product('tapioca-sensacao', 'tapiocas-doces', 'Sensação', 1299, 'Chocolate preto e morango.', 'tapioca-sensacao'),
  product('tapioca-prestigio', 'tapiocas-doces', 'Prestígio', 1299, 'Chocolate preto e coco.', 'tapioca-prestigio'),
  product('tapioca-chocolate-preto', 'tapiocas-doces', 'Chocolate Preto', 1299, 'Tapioca doce.', 'tapioca-chocolate-preto'),
  product('tapioca-chocolate-branco', 'tapiocas-doces', 'Chocolate Branco', 1299, 'Tapioca doce.', 'tapioca-chocolate-branco'),
];
const extras = ['Azeitona', 'Catupiry', 'Requeijão', 'Ovos', 'Pimentão', 'Cebola', 'Milho', 'Calabresa', 'Bacon', 'Tomate'];
const savoryPastels = [
  ['Carne', 'Carne'], ['Frango', 'Frango'], ['Calabresa', 'Calabresa'], ['Portuguesa', 'Portuguesa'],
  ['Frango e Requeijão', 'Frango e Requeijão'], ['Frango e Catupiry', 'Frango e Catupiry'], ['Frango e Queijo', 'Frango e Queijo'], ['Queijo', 'Queijo'],
  ['Pizza', 'Pizza'], ['Calabresa e Queijo', 'Calabresa e Queijo'], ['Calabresa e Cebola', 'Calabresa e Cebola'], ['Palmito', 'Palmito'],
];
for (const [slug, name] of savoryPastels) products.push(product(`pastel-${slug.toLowerCase().replaceAll(' ', '-')}`, 'pasteis-salgados', `Pastel ${name}`, ['Carne', 'Frango', 'Calabresa', 'Portuguesa'].includes(name) ? 1500 : 1599,
  `Pastel salgado tradicional de 22 cm${name === 'Pizza' ? ', com molho, presunto e orégano' : name === 'Calabresa e Queijo' ? ', com calabresa fatiada e muçarela' : name === 'Calabresa e Cebola' ? ', com calabresa fatiada, muçarela e cebola' : name === 'Palmito' ? ', com palmito, muçarela e orégano' : ''}.`, 'pastel-salgado', {
    modifierGroups: [{ id: `ref-extra-${slug}`, name: 'Adicionais (+R$ 2,00 cada)', required: false, multiple: true, options: extras.map((extraName, index) => ({ id: `ref-extra-${slug}-${index}`, name: extraName, priceCents: 200, available: true })) }],
  }));
const sweetPastels = [
  ['Chocolate Branco', 'pastel-doce-chocolate-branco', 'Chocolate branco cremoso'], ['Chocolate Preto', 'pastel-doce-chocolate-preto', 'Chocolate preto cremoso'],
  ['Banoffee', 'pastel-doce-banoffee', 'Banana, canela e doce de leite'], ['Dois Amores', 'pastel-doce-dois-amores', 'Chocolate branco e preto cremosos'],
  ['Sensação', 'pastel-doce-sensacao', 'Chocolate preto e morango'], ['Prestígio', 'pastel-doce-prestigio', 'Chocolate preto e coco'],
];
for (const [name, image, description] of sweetPastels) products.push(product(`pastel-doce-${image.replace('pastel-doce-', '')}`, 'pasteis-doces', `Pastel ${name}`, 1799, `Pastel doce de 18 cm, ${description.toLowerCase()}.`, image));
for (const [slug, name] of [['pastel', 'Cone de Pastel'], ['coxinha', 'Cone de Coxinha'], ['mini-churros', 'Cone de Mini Churros'], ['batata', 'Cone de Batata Frita'], ['misto', 'Cone Misto']]) {
  products.push(product(`cone-${slug}`, 'salgados-no-cone', name, null, 'Consulte o valor com a lanchonete pelo WhatsApp.', `cone-${slug}`, { priceOnRequest: true }));
}
products.push(product('x-calota-explosao', 'x-calota', 'X-Calota Explosão', null, 'X-Calota de 30 cm. Escolha entre carne de costela ou frango; valor a confirmar.', 'x-calota-explosao', {
  priceOnRequest: true,
  modifierGroups: [{ id: 'ref-x-calota-recheio', name: 'Escolha o sabor', required: true, multiple: false, options: [
    { id: 'ref-calota-costela', name: 'Carne de costela', priceCents: 0, available: true }, { id: 'ref-calota-frango', name: 'Frango', priceCents: 0, available: true },
  ] }],
}));
products.push(product('prato-executivo-marmita', 'pratos-executivos', 'Prato Executivo / Marmita', 2000, 'Acompanha arroz, feijão, salada e batata frita. Consulte as opções de proteína pelo WhatsApp.', 'prato-executivo'));
const juices = [['laranja', 'Laranja'], ['morango', 'Morango'], ['maracuja', 'Maracujá'], ['abacaxi', 'Abacaxi'], ['abacaxi-hortela', 'Abacaxi com Hortelã'], ['manga', 'Manga'], ['limao', 'Limão']];
for (const [slug, name] of juices) products.push(product(`suco-${slug}`, 'sucos-naturais', `Suco natural de ${name}`, 800, 'Suco natural. Escolha o tamanho.', `suco-${slug}`, {
  modifierGroups: [{ id: `ref-tamanho-${slug}`, name: 'Tamanho', required: true, multiple: false, options: [
    { id: `ref-250-${slug}`, name: '250 ml', priceCents: 0, available: true }, { id: `ref-400-${slug}`, name: '400 ml', priceCents: 400, available: true },
  ] }],
}));

const importedIds = new Set(products.map(({ id }) => id));
const importedCategoryIds = new Set(categories.map(({ id }) => id));
await store.saveCatalog({
  ...current,
  categories: [...categories, ...current.categories.filter(({ id }) => !importedCategoryIds.has(id))],
  products: [...products, ...current.products.filter(({ id }) => !importedIds.has(id))],
});
console.log(`Cardápio importado: ${products.length} produtos em ${categories.length} categorias.`);
