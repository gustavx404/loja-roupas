const fallbackProducts = [
  { id: 1, name: 'Camiseta Move', category: 'Casual', price: 89, tag: 'MAIS VENDIDA', image: '/images/products/tee.webp', desc: 'Algodão macio · Areia', sizes: ['P', 'M', 'G', 'GG'] },
  { id: 2, name: 'Regata Flow', category: 'Treino', price: 79, tag: 'LEVE NO CORPO', image: '/images/products/tank.webp', desc: 'Dry fit · Verde sálvia', sizes: ['P', 'M', 'G', 'GG'] },
  { id: 3, name: 'Short Pace', category: 'Treino', price: 119, tag: 'PRONTO PRO TREINO', image: '/images/products/shorts.webp', desc: 'Leve e flexível · Grafite', sizes: ['P', 'M', 'G', 'GG'] },
  { id: 4, name: 'Moletom Relax', category: 'Casual', price: 199, tag: '', image: '/images/products/tee.webp', desc: 'Algodão confortável · Caramelo', sizes: ['P', 'M', 'G', 'GG'] },
  { id: 5, name: 'Top Flow', category: 'Treino', price: 99, tag: 'SUSTENTAÇÃO MÉDIA', image: '/images/products/top.webp', desc: 'Tecido elástico · Terracota', sizes: ['P', 'M', 'G'] },
  { id: 6, name: 'Calça Move', category: 'Casual', price: 189, tag: '', image: '/images/products/shorts.webp', desc: 'Moletinho leve · Preto', sizes: ['P', 'M', 'G', 'GG'] },
  { id: 7, name: 'Camiseta Pace', category: 'Treino', price: 99, tag: 'DRY FIT', image: '/images/products/tank.webp', desc: 'Secagem rápida · Oliva', sizes: ['P', 'M', 'G', 'GG'] },
  { id: 8, name: 'Short Everyday', category: 'Casual', price: 129, tag: '', image: '/images/products/shorts.webp', desc: 'Conforto todo dia · Natural', sizes: ['P', 'M', 'G', 'GG'] },
];

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const cart = [];
let products = fallbackProducts;
let filters = ['Tudo', 'Casual', 'Treino'];
let filter = 'Tudo';
let selectedProduct = null;
let selectedSize = '';
let selectedSizePriceCents = 0;
let selectedOptionLabel = 'Tamanho';
let storeWhatsapp = '';

const filterNode = document.querySelector('#filters');
const productsNode = document.querySelector('#products');
const sizeDialog = document.querySelector('#size-dialog');
const sizeOptions = document.querySelector('#size-options');

function productPriceCents(product) {
  if (Number.isSafeInteger(product.priceCents)) return product.priceCents;
  return Math.round((Number(product.price) || 0) * 100);
}

function productPriceLabel(product) {
  return product.priceOnRequest ? 'Sob consulta' : money(productPriceCents(product) / 100);
}

function drawFilters() {
  filterNode.innerHTML = filters.map((name) => {
    const active = name === filter;
    return `<button class="filter${active ? ' active' : ''}" type="button" data-filter="${escapeHtml(name)}" aria-pressed="${active}">${escapeHtml(name)}</button>`;
  }).join('');
}

function drawProducts() {
  const visible = products.filter((product) => filter === 'Tudo' || product.category === filter);
  if (!visible.length) {
    productsNode.innerHTML = '<p class="store-empty">Ainda não há peças nesta categoria. Volte em breve.</p>';
    return;
  }
  productsNode.innerHTML = visible.map((product) => `<article class="product-card">
    <button class="product-image" type="button" data-add="${escapeHtml(product.id)}" aria-label="Escolher ${escapeHtml(product.sizesLabel || 'tamanho')} de ${escapeHtml(product.name)}">
      <img class="product-photo" src="${escapeHtml(product.image || '/images/products/tee.webp')}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async">
      ${product.tag ? `<span class="product-tag">${escapeHtml(product.tag)}</span>` : ''}
      <span class="quick-add">ESCOLHER ${escapeHtml((product.sizesLabel || 'TAMANHO').toLocaleUpperCase('pt-BR'))} <b>+</b></span>
    </button>
    <div class="product-info"><div class="product-title-row"><h3>${escapeHtml(product.name)}</h3><b>${escapeHtml(productPriceLabel(product))}</b></div>
      <p>${escapeHtml(product.desc || '')}</p><span class="product-category">${escapeHtml(product.category || 'MOVO')}</span>
    </div>
  </article>`).join('');
}

function sizeChoices(product) {
  if (Array.isArray(product.sizes) && product.sizes.length) {
    return product.sizes.map((size) => typeof size === 'string'
      ? { name: size, priceCents: 0 }
      : { name: size.name, priceCents: size.priceCents ?? 0 });
  }
  return [{ name: 'Único', priceCents: 0 }];
}

function openSizePicker(product) {
  if (!product) return;
  selectedProduct = product;
  selectedSize = '';
  selectedSizePriceCents = 0;
  selectedOptionLabel = product.sizesLabel || 'Tamanho';
  document.querySelector('#size-eyebrow').textContent = `ESCOLHA ${selectedOptionLabel.toLocaleUpperCase('pt-BR')}`;
  document.querySelector('#size-title').textContent = product.name;
  document.querySelector('#size-product-description').textContent = `${product.desc || ''} · ${productPriceLabel(product)}`;
  sizeOptions.innerHTML = sizeChoices(product).filter((choice) => choice.available !== false).map((choice) => `<button class="size-option" type="button" data-size="${escapeHtml(choice.name)}" data-price-cents="${choice.priceCents}" aria-pressed="false">${escapeHtml(choice.name)}${choice.priceCents ? `<small>+ ${money(choice.priceCents / 100)}</small>` : ''}</button>`).join('');
  document.querySelector('#size-confirm').disabled = true;
  sizeDialog.showModal();
}

function cartItemPriceCents(item) {
  return Number.isSafeInteger(item.unitPriceCents) ? item.unitPriceCents : productPriceCents(item.product);
}

function drawCart() {
  document.querySelector('#bag-count').textContent = String(cart.reduce((total, item) => total + item.qty, 0));
  document.querySelector('#bag-items').innerHTML = cart.map((item, index) => {
    const amount = item.priceOnRequest ? 'Preço a combinar' : money(cartItemPriceCents(item) * item.qty / 100);
    return `<div class="bag-item"><div>${escapeHtml(item.product.name)}<small>${escapeHtml(selectedOptionLabelFor(item))} ${escapeHtml(item.size)} · ${item.qty} un.</small></div><b>${escapeHtml(amount)}</b><button type="button" data-remove="${index}" aria-label="Remover ${escapeHtml(item.product.name)}">×</button></div>`;
  }).join('') || '<p class="empty-bag">Sua próxima peça favorita começa aqui.</p>';
  const hasQuote = cart.some((item) => item.priceOnRequest);
  const subtotal = cart.reduce((total, item) => total + (item.priceOnRequest ? 0 : cartItemPriceCents(item) * item.qty), 0);
  document.querySelector('#subtotal').textContent = hasQuote ? 'A confirmar' : money(subtotal / 100);
  document.querySelector('#checkout').disabled = !cart.length;
}

function selectedOptionLabelFor(item) {
  return item.optionLabel || 'Tamanho';
}

function addSelectedToCart() {
  if (!selectedProduct || !selectedSize) return;
  const basePriceCents = productPriceCents(selectedProduct);
  const unitPriceCents = basePriceCents + selectedSizePriceCents;
  const existing = cart.find((item) => item.product.id === selectedProduct.id && item.size === selectedSize && item.priceOnRequest === Boolean(selectedProduct.priceOnRequest));
  if (existing) existing.qty += 1;
  else cart.push({ product: selectedProduct, size: selectedSize, qty: 1, optionLabel: selectedOptionLabel, priceOnRequest: Boolean(selectedProduct.priceOnRequest), unitPriceCents });
  drawCart();
  sizeDialog.close();
  document.body.classList.add('bag-open');
}

function setStoreCategories(categories) {
  const names = [...new Set(categories.map((category) => category.name).filter(Boolean))];
  filters = ['Tudo', ...names];
  if (!filters.includes(filter)) filter = 'Tudo';
  const nav = document.querySelector('.header nav');
  if (!nav) return;
  nav.replaceChildren();
  const addLink = (label, href, category = '') => {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    if (category) link.dataset.filterLink = category;
    nav.append(link);
  };
  addLink('Novidades', '#colecao', 'Tudo');
  names.forEach((name) => addLink(name, '#colecao', name));
  addLink('Nossa ideia', '#sobre');
}

function mapCatalogProducts(catalog) {
  const categories = new Map(catalog.categories.map((category) => [category.id, category.name]));
  return catalog.products.filter((product) => product.available !== false).map((product) => {
    const group = product.modifierGroups?.find((item) => item.required) ?? product.modifierGroups?.[0];
    const sizes = group
      ? group.options.filter((option) => option.available !== false).map((option) => ({ name: option.name, priceCents: option.priceCents, available: option.available }))
      : [{ name: 'Único', priceCents: 0 }];
    if (!sizes.length) return null;
    return {
      id: product.id,
      name: product.name,
      category: categories.get(product.categoryId) || 'Sem categoria',
      priceCents: product.priceCents,
      priceOnRequest: product.priceOnRequest,
      image: product.imageUrl || '/images/products/tee.webp',
      desc: product.description,
      tag: '',
      sizes,
      sizesLabel: group?.name || 'Tamanho',
    };
  }).filter(Boolean);
}

filterNode.addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  filter = button.dataset.filter;
  drawFilters();
  drawProducts();
});

document.querySelector('.header nav')?.addEventListener('click', (event) => {
  const link = event.target.closest('[data-filter-link]');
  if (!link) return;
  filter = link.dataset.filterLink;
  drawFilters();
  drawProducts();
});

productsNode.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add]');
  if (button) openSizePicker(products.find((product) => String(product.id) === button.dataset.add));
});
productsNode.addEventListener('error', (event) => {
  const image = event.target;
  if (image.matches('.product-photo') && !image.dataset.fallback) {
    image.dataset.fallback = 'true';
    image.src = '/images/products/tee.webp';
  }
}, true);

sizeOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-size]');
  if (!button) return;
  selectedSize = button.dataset.size;
  selectedSizePriceCents = Number(button.dataset.priceCents) || 0;
  sizeOptions.querySelectorAll('.size-option').forEach((option) => {
    const active = option === button;
    option.classList.toggle('selected', active);
    option.setAttribute('aria-pressed', String(active));
  });
  document.querySelector('#size-confirm').disabled = false;
});

document.querySelector('#size-confirm').addEventListener('click', addSelectedToCart);
document.querySelector('#size-cancel').addEventListener('click', () => sizeDialog.close());
document.querySelector('#bag-open').addEventListener('click', () => document.body.classList.add('bag-open'));
document.querySelector('#bag-close').addEventListener('click', () => document.body.classList.remove('bag-open'));
document.querySelector('#overlay').addEventListener('click', () => document.body.classList.remove('bag-open'));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') document.body.classList.remove('bag-open'); });
document.querySelector('#bag-items').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  cart.splice(Number(button.dataset.remove), 1);
  drawCart();
});
document.querySelector('#checkout').addEventListener('click', () => {
  const lines = cart.map((item) => {
    const price = item.priceOnRequest ? 'Preço a combinar' : money(cartItemPriceCents(item) * item.qty / 100);
    return `${item.qty}x ${item.product.name} — ${item.optionLabel || 'Tamanho'} ${item.size}: ${price}`;
  }).join('\n');
  const total = cart.some((item) => item.priceOnRequest)
    ? 'A confirmar'
    : money(cart.reduce((sum, item) => sum + cartItemPriceCents(item) * item.qty, 0) / 100);
  const phone = storeWhatsapp ? storeWhatsapp.replace(/\D/g, '') : '';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(`Oi! Quero fazer este pedido:\n${lines}\nTotal: ${total}`)}`;
  window.open(url, '_blank', 'noopener');
});

document.querySelector('#year').textContent = new Date().getFullYear();
drawFilters();
drawProducts();
drawCart();

async function loadStoreCatalog() {
  try {
    const response = await fetch('/api/menu', { cache: 'no-store' });
    if (!response.ok) return;
    const catalog = await response.json();
    const { restaurant } = catalog;
    if (restaurant) {
      if (restaurant.name) {
        document.querySelectorAll('.logo').forEach((logo) => {
          if (logo.firstChild) logo.firstChild.nodeValue = restaurant.name;
        });
        document.title = `${restaurant.name} — movimento é seu`;
      }
      if (restaurant.whatsapp) storeWhatsapp = restaurant.whatsapp.replace(/\D/g, '');
      if (restaurant.hours) {
        const deliveryInfo = document.querySelector('#store-delivery-info');
        deliveryInfo.textContent = restaurant.hours;
        deliveryInfo.hidden = false;
      }
      if (restaurant.announcement) document.querySelector('#announcement').textContent = restaurant.announcement;
      // Keep the designed line break and accent markup for the storefront default.
      if (restaurant.heroTitle && restaurant.heroTitle !== 'Do seu jeito. No seu ritmo.') {
        document.querySelector('#hero-title').textContent = restaurant.heroTitle;
      }
      if (restaurant.heroDescription) document.querySelector('#hero-description').textContent = restaurant.heroDescription;
      if (restaurant.heroImageUrl) {
        const heroImage = document.querySelector('.hero-photo');
        heroImage.onerror = () => { heroImage.onerror = null; heroImage.src = '/images/hero-set.png'; };
        heroImage.src = restaurant.heroImageUrl;
      }
      if (restaurant.faviconUrl) {
        const favicon = `${restaurant.faviconUrl}${restaurant.faviconUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(restaurant.faviconUrl)}`;
        document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach((link) => { link.href = favicon; });
      }
    }
    if (catalog.catalogManaged) {
      products = mapCatalogProducts(catalog);
      setStoreCategories(catalog.categories);
      drawFilters();
      drawProducts();
    }
  } catch {
    // The static collection stays usable if the catalog API is unavailable.
  }
}

loadStoreCatalog();
