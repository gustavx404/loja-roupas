import { randomUUID } from 'node:crypto';

const money = (value) => Number.isSafeInteger(value) && value >= 0;
const text = (value, max = 180) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const optionalText = (value, max = 1000) => value === '' || value == null || (typeof value === 'string' && value.length <= max);

export function emptyCatalog() {
  return {
    restaurant: {
      name: 'Sabor Brasileiro',
      whatsapp: '',
      hours: '',
    },
    categories: [],
    products: [],
  };
}

export function normalizeCatalog(input) {
  if (!input || typeof input !== 'object' || !input.restaurant || !Array.isArray(input.categories) || !Array.isArray(input.products)) {
    throw new Error('Formato de cardápio inválido.');
  }

  if (!text(input.restaurant.name, 80) || !optionalText(input.restaurant.hours, 500)) {
    throw new Error('Confira o nome da lanchonete e os horários.');
  }
  const whatsapp = typeof input.restaurant.whatsapp === 'string' ? input.restaurant.whatsapp.replace(/\D/g, '') : '';
  if (whatsapp && (whatsapp.length < 8 || whatsapp.length > 15)) throw new Error('Informe o WhatsApp com DDI e DDD.');
  const restaurant = {
    name: input.restaurant.name.trim(),
    whatsapp,
    hours: (input.restaurant.hours ?? '').trim(),
  };

  if (!Array.isArray(input.categories) || input.categories.length > 40 || input.products.length > 300) {
    throw new Error('O cardápio excede os limites permitidos.');
  }

  const categoryIds = new Set();
  const categories = input.categories.map((category) => {
    const id = typeof category.id === 'string' && category.id.length <= 50 ? category.id : randomUUID();
    if (categoryIds.has(id) || !text(category.name, 60)) throw new Error('Confira as categorias do cardápio.');
    categoryIds.add(id);
    return { id, name: category.name.trim() };
  });

  const productIds = new Set();
  const products = input.products.map((product) => {
    const id = typeof product.id === 'string' && product.id.length <= 50 ? product.id : randomUUID();
    const priceOnRequest = product.priceOnRequest === true;
    if (productIds.has(id) || !text(product.name, 100) || !(priceOnRequest ? product.priceCents == null : money(product.priceCents))) {
      throw new Error('Confira o nome e o preço dos produtos.');
    }
    productIds.add(id);
    if (product.categoryId && !categoryIds.has(product.categoryId)) throw new Error('Uma categoria de produto não existe.');
    if (!optionalText(product.description, 500) || !optionalText(product.imageUrl, 600)) throw new Error('Confira a descrição ou foto de um produto.');
    if (product.imageUrl && (!/^\/(?:media|images\/menu-products)\/[\w./-]+$/.test(product.imageUrl) || /(?:^|\/)\.\.(?:\/|$)/.test(product.imageUrl))) {
      throw new Error('As fotos precisam ser enviadas pelo painel.');
    }

    const groupIds = new Set();
    const modifierGroups = (Array.isArray(product.modifierGroups) ? product.modifierGroups : []).map((group) => {
      const groupId = typeof group.id === 'string' && group.id.length <= 50 ? group.id : randomUUID();
      if (groupIds.has(groupId) || !text(group.name, 80) || !Array.isArray(group.options) || !group.options.length || group.options.length > 30) {
        throw new Error('Confira os grupos de opções do produto.');
      }
      groupIds.add(groupId);
      const options = group.options.map((option) => {
        const optionId = typeof option.id === 'string' && option.id.length <= 50 ? option.id : randomUUID();
        if (!text(option.name, 80) || !money(option.priceCents)) throw new Error('Confira uma opção ou seu preço.');
        return { id: optionId, name: option.name.trim(), priceCents: option.priceCents, available: option.available !== false };
      });
      const min = group.required ? 1 : 0;
      return { id: groupId, name: group.name.trim(), required: Boolean(group.required), min, max: group.multiple ? options.length : 1, options };
    });

    const removals = (Array.isArray(product.removals) ? product.removals : []).map((item) => {
      if (!text(item, 80)) throw new Error('Confira as opções de remoção.');
      return item.trim();
    });

    return {
      id,
      categoryId: product.categoryId || '',
      name: product.name.trim(),
      description: (product.description ?? '').trim(),
      priceCents: priceOnRequest ? null : product.priceCents,
      priceOnRequest,
      imageUrl: (product.imageUrl ?? '').trim(),
      available: product.available !== false,
      modifierGroups,
      removals,
    };
  });

  return { restaurant, categories, products };
}

export function publicCatalog(catalog) {
  return {
    restaurant: catalog.restaurant,
    categories: catalog.categories,
    products: catalog.products.map(({ id, categoryId, name, description, priceCents, priceOnRequest, imageUrl, available, modifierGroups, removals }) => ({
      id, categoryId, name, description, priceCents, priceOnRequest, imageUrl, available, modifierGroups, removals,
    })),
  };
}
