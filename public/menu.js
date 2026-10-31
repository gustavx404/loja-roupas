const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const state = { catalog: null, categoryId: 'all', cart: [], activeProduct: null };
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const formatMoney = (cents) => money.format(cents / 100);

async function loadMenu() {
  const response = await fetch('/api/menu');
  if (!response.ok) throw new Error('Não foi possível carregar o cardápio.');
  state.catalog = await response.json();
  document.title = `${state.catalog.restaurant.name} · Cardápio`;
  $$('[data-restaurant-name]').forEach((node) => { node.textContent = state.catalog.restaurant.name; });
  $('#restaurant-hours').textContent = state.catalog.restaurant.hours || 'Consulte os horários pelo WhatsApp';
  $('#year').textContent = new Date().getFullYear();
  renderCategories();
  renderProducts();
}

function renderCategories() {
  const categories = [{ id: 'all', name: 'Tudo' }, ...state.catalog.categories];
  const list = $('#category-list');
  const scrollPosition = list.scrollLeft;
  list.innerHTML = categories.map((category) => `
    <button class="category-chip ${state.categoryId === category.id ? 'is-active' : ''}" data-category="${escapeHtml(category.id)}" type="button" aria-pressed="${state.categoryId === category.id}">
      ${escapeHtml(category.name)}
    </button>`).join('');
  list.scrollLeft = scrollPosition;
  updateCategoryOverflow();
}

function updateCategoryOverflow() {
  const list = $('#category-list');
  const control = $('#category-more');
  const maxScroll = list.scrollWidth - list.clientWidth;
  control.hidden = maxScroll <= 2;
  if (control.hidden) return;
  const atEnd = list.scrollLeft >= maxScroll - 4;
  control.textContent = atEnd ? '‹ Voltar' : 'Mais ›';
  control.setAttribute('aria-label', atEnd ? 'Voltar às primeiras categorias' : 'Ver mais categorias');
  control.dataset.direction = atEnd ? '-1' : '1';
}

function productCard(product) {
  const unavailable = !product.available || product.priceOnRequest;
  const unavailableLabel = product.priceOnRequest ? 'Valor a confirmar' : 'Produto indisponível';
  return `<article class="product-card glass-panel ${unavailable ? 'is-unavailable' : ''}">
    ${product.imageUrl ? `<button class="product-image-trigger" type="button" data-zoom-image="${escapeHtml(product.id)}" aria-label="Ampliar foto de ${escapeHtml(product.name)}"><span class="product-image-wrap"><img class="product-image" src="${escapeHtml(product.imageUrl)}" alt="" loading="lazy">
      ${product.priceOnRequest ? '<span class="unavailable-pill">Valor a confirmar</span>' : unavailable ? '<span class="unavailable-pill">Indisponível</span>' : ''}</span>
    </button>` : '<div class="product-image-wrap"><span class="image-placeholder" aria-hidden="true"><span>✳</span></span></div>'}
    <div class="product-card-copy"><div class="product-card-text"><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description)}</p></div>
      <div class="product-card-bottom"><strong>${product.priceOnRequest ? 'Sob consulta' : formatMoney(product.priceCents)}</strong><button class="add-product-button" type="button" data-add-product="${escapeHtml(product.id)}" ${unavailable ? `disabled aria-label="${unavailableLabel}"` : `aria-label="Adicionar ${escapeHtml(product.name)} à sacola"`}><span aria-hidden="true">+</span><span>${product.priceOnRequest ? 'Valor a confirmar' : product.available ? 'Adicionar à sacola' : 'Indisponível'}</span></button></div></div>
  </article>`;
}

function renderProducts() {
  const products = state.catalog.products.filter((product) => state.categoryId === 'all' || product.categoryId === state.categoryId);
  const grid = $('#product-grid');
  if (!products.length) {
    grid.innerHTML = `<div class="empty-menu glass-panel"><span class="empty-mark" aria-hidden="true">✳</span><h3>${state.catalog.products.length ? 'Ainda não há produtos nesta categoria.' : 'Estamos preparando o cardápio.'}</h3><p>${state.catalog.products.length ? 'Escolha outra categoria para continuar.' : 'Volte em breve para conhecer nossos sabores.'}</p></div>`;
    return;
  }
  grid.innerHTML = products.map(productCard).join('');
}

function openProduct(product) {
  state.activeProduct = product;
  if (product.priceOnRequest) {
    $('#product-dialog-content').innerHTML = `<p class="eyebrow">CONFIRME O VALOR COM A GENTE</p><h2>${escapeHtml(product.name)}</h2><p class="dialog-product-description">${escapeHtml(product.description)}</p><div class="dialog-base-price"><span>Preço</span><strong>Sob consulta</strong></div>`;
    $('#product-dialog').showModal();
    return;
  }
  const groupsHtml = product.modifierGroups.map((group, groupIndex) => {
    const type = group.max > 1 ? 'checkbox' : 'radio';
    return `<fieldset class="choice-group" data-group="${escapeHtml(group.id)}" data-required="${group.required}" data-max="${group.max}">
      <legend>${escapeHtml(group.name)} ${group.required ? '<span class="required-mark">Obrigatório</span>' : '<span class="optional-mark">Opcional</span>'}</legend>
      <div class="choice-list">${group.options.filter((option) => option.available).map((option) => `<label class="choice-row"><span class="choice-copy">${escapeHtml(option.name)}${option.priceCents ? `<small>+ ${formatMoney(option.priceCents)}</small>` : ''}</span><input type="${type}" name="group-${groupIndex}" value="${escapeHtml(option.id)}" data-option-name="${escapeHtml(option.name)}" data-option-price="${option.priceCents}" ${type === 'radio' && group.required ? 'required' : ''}></label>`).join('')}</div>
    </fieldset>`;
  }).join('');
  const removalsHtml = product.removals.length ? `<fieldset class="choice-group"><legend>Sem algum ingrediente? <span class="optional-mark">Opcional</span></legend><div class="choice-list">${product.removals.map((item, index) => `<label class="choice-row"><span class="choice-copy">Sem ${escapeHtml(item)}</span><input type="checkbox" name="remove-${index}" value="${escapeHtml(item)}"></label>`).join('')}</div></fieldset>` : '';
  $('#product-dialog-content').innerHTML = `<form id="customizer-form" class="customizer-form">
    <p class="eyebrow">DO SEU JEITO</p><h2>${escapeHtml(product.name)}</h2><p class="dialog-product-description">${escapeHtml(product.description)}</p><div class="dialog-base-price">A partir de <strong>${formatMoney(product.priceCents)}</strong></div>
    ${groupsHtml}${removalsHtml}
    <label class="field-label" for="item-note">Observação</label><textarea id="item-note" name="note" rows="2" maxlength="240" placeholder="Algum pedido especial?"></textarea>
    <div class="quantity-row"><span>Quantidade</span><input name="quantity" type="number" min="1" max="20" value="1" aria-label="Quantidade"></div>
    <p class="form-error" id="customizer-error" role="alert"></p><button class="primary-button full-width customizer-submit" type="submit">Adicionar à sacola <span id="customizer-price">${formatMoney(product.priceCents)}</span></button>
  </form>`;
  $('#product-dialog').showModal();
  $('#customizer-form').addEventListener('change', updateCustomizerTotal);
  $('#customizer-form').addEventListener('input', updateCustomizerTotal);
  $('#customizer-form').addEventListener('submit', addConfiguredProduct);
  updateCustomizerTotal();
}

function readSelections(form) {
  const selected = [];
  $$('.choice-row input:checked', form).forEach((input) => {
    if (input.dataset.optionName) selected.push({ name: input.dataset.optionName, priceCents: Number(input.dataset.optionPrice) });
  });
  return selected;
}

function updateCustomizerTotal() {
  const form = $('#customizer-form');
  if (!form || !state.activeProduct) return;
  const total = state.activeProduct.priceCents + readSelections(form).reduce((sum, item) => sum + item.priceCents, 0);
  $('#customizer-price').textContent = formatMoney(total);
}

function addConfiguredProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const error = $('#customizer-error');
  error.textContent = '';
  for (const group of $$('.choice-group[data-required="true"]', form)) {
    const checked = $$('input:checked', group).length;
    if (!checked) {
      error.textContent = `Escolha uma opção em “${group.querySelector('legend').childNodes[0].textContent.trim()}”.`;
      return;
    }
  }
  for (const group of $$('.choice-group[data-max]', form)) {
    if ($$('input:checked', group).length > Number(group.dataset.max)) {
      error.textContent = `Escolha até ${group.dataset.max} opção(ões) em “${group.querySelector('legend').childNodes[0].textContent.trim()}”.`;
      return;
    }
  }
  const selections = readSelections(form);
  const removals = $$('.choice-row input:checked', form).filter((input) => input.name.startsWith('remove-')).map((input) => input.value);
  const quantity = Math.max(1, Math.min(20, Number(new FormData(form).get('quantity')) || 1));
  addProductToCart(state.activeProduct, selections, removals, String(new FormData(form).get('note') ?? '').trim(), quantity);
  $('#product-dialog').close();
}

function addProductToCart(product, selections = [], removals = [], note = '', quantity = 1) {
  const unitPriceCents = product.priceCents + selections.reduce((sum, item) => sum + item.priceCents, 0);
  state.cart.push({
    id: crypto.randomUUID(),
    productId: product.id,
    name: product.name,
    selections,
    removals,
    note,
    quantity,
    unitPriceCents,
  });
  updateCart();
  showToast(`${product.name} adicionado à sacola`);
}

function cartItemHtml(item) {
  const detailParts = [item.selections.map((choice) => choice.name).join(', '), item.removals.map((name) => `sem ${name}`).join(', '), item.note].filter(Boolean);
  return `<article class="cart-item"><div class="cart-item-copy"><h3>${escapeHtml(item.name)}</h3>${detailParts.length ? `<p>${detailParts.map(escapeHtml).join(' · ')}</p>` : ''}<strong>${formatMoney(item.unitPriceCents * item.quantity)}</strong></div><div class="cart-item-actions"><button type="button" data-quantity="-1" data-line="${item.id}" aria-label="Remover uma unidade">−</button><span>${item.quantity}</span><button type="button" data-quantity="1" data-line="${item.id}" aria-label="Adicionar uma unidade">+</button><button class="remove-line" type="button" data-remove-line="${item.id}" aria-label="Remover item">×</button></div></article>`;
}

function updateCart() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = state.cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  $('#cart-count').textContent = String(count);
  $('#cart-count').classList.toggle('has-items', count > 0);
  $('#cart-total').textContent = formatMoney(total);
  $('#checkout-button').disabled = count === 0;
  $('#cart-items').innerHTML = state.cart.length ? state.cart.map(cartItemHtml).join('') : `<div class="cart-empty"><span aria-hidden="true">✳</span><h3>Sua sacola está esperando.</h3><p>Escolha algo gostoso para começar.</p><button class="text-button" id="browse-menu" type="button">Ver o cardápio</button></div>`;
}

function changeQuantity(id, delta) {
  const item = state.cart.find((line) => line.id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity < 1) state.cart = state.cart.filter((line) => line.id !== id);
  if (item.quantity > 20) item.quantity = 20;
  updateCart();
}

function openCart() {
  $('#cart-sheet').hidden = false;
  $('#sheet-backdrop').hidden = false;
  document.body.classList.add('sheet-open');
  $('#close-cart').focus();
}

function closeCart() {
  $('#cart-sheet').hidden = true;
  $('#sheet-backdrop').hidden = true;
  document.body.classList.remove('sheet-open');
  $('#open-cart').focus();
}

function createWhatsAppMessage(customerName) {
  const lines = [
    `Olá! Meu nome é ${customerName}. Gostaria de fazer este pedido:`,
    '',
    ...state.cart.map((item) => {
      const lineTotal = item.unitPriceCents * item.quantity;
      const detailParts = [
        ...item.selections.map((choice) => choice.priceCents ? `${choice.name} (+${formatMoney(choice.priceCents)})` : choice.name),
        ...item.removals.map((name) => `sem ${name}`),
        item.note ? `Obs.: ${item.note}` : '',
      ].filter(Boolean);
      return `${item.quantity}× ${item.name}${detailParts.length ? `\n   ${detailParts.join(' · ')}` : ''}\n   ${formatMoney(lineTotal)}`;
    }),
    '',
    `Total: ${formatMoney(state.cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0))}`,
  ];
  return lines.join('\n');
}

function checkout() {
  if (!state.catalog.restaurant.whatsapp) {
    showToast('A lanchonete ainda não configurou o WhatsApp.');
    return;
  }
  $('#name-error').textContent = '';
  $('#name-dialog').showModal();
  $('#customer-name').focus();
}

function submitName(event) {
  event.preventDefault();
  const name = $('#customer-name').value.trim();
  if (!name) return;
  const message = createWhatsAppMessage(name);
  const target = `https://wa.me/${state.catalog.restaurant.whatsapp}?text=${encodeURIComponent(message)}`;
  const link = document.createElement('a');
  link.href = target;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.click();
  state.cart = [];
  updateCart();
  $('#name-dialog').close();
  closeCart();
}

let toastTimer;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

$('#category-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.categoryId = button.dataset.category;
  renderCategories();
  renderProducts();
});
$('#category-list').addEventListener('scroll', updateCategoryOverflow, { passive: true });
$('#category-more').addEventListener('click', (event) => {
  const list = $('#category-list');
  const direction = Number(event.currentTarget.dataset.direction || 1);
  list.scrollBy({ left: direction * Math.max(180, list.clientWidth * 0.72), behavior: 'smooth' });
});
window.addEventListener('resize', updateCategoryOverflow);

$('#product-grid').addEventListener('click', (event) => {
  const zoomButton = event.target.closest('[data-zoom-image]');
  const button = event.target.closest('[data-add-product]');
  if (zoomButton) {
    const product = state.catalog.products.find((item) => item.id === zoomButton.dataset.zoomImage);
    if (product?.imageUrl) {
      $('#zoomed-product-image').src = product.imageUrl;
      $('#zoomed-product-image').alt = product.name;
      $('#image-zoom-dialog').showModal();
    }
    return;
  }
  if (!button || button.disabled) return;
  const product = state.catalog.products.find((item) => item.id === button.dataset.addProduct);
  if (!product) return;
  if (product.modifierGroups.some((group) => group.required)) openProduct(product);
  else addProductToCart(product);
});

$('#open-cart').addEventListener('click', openCart);
$('#close-cart').addEventListener('click', closeCart);
$('#sheet-backdrop').addEventListener('click', closeCart);
$('#checkout-button').addEventListener('click', checkout);
$('#cart-items').addEventListener('click', (event) => {
  const quantity = event.target.closest('[data-quantity]');
  const remove = event.target.closest('[data-remove-line]');
  if (quantity) changeQuantity(quantity.dataset.line, Number(quantity.dataset.quantity));
  if (remove) {
    state.cart = state.cart.filter((line) => line.id !== remove.dataset.removeLine);
    updateCart();
  }
  if (event.target.closest('#browse-menu')) closeCart();
});
$('#cancel-name').addEventListener('click', () => $('#name-dialog').close());
$('#name-form').addEventListener('submit', submitName);
$('#product-dialog').addEventListener('click', (event) => {
  if (event.target === $('#product-dialog')) $('#product-dialog').close();
});
$('#image-zoom-dialog').addEventListener('click', (event) => {
  if (event.target === $('#image-zoom-dialog')) $('#image-zoom-dialog').close();
});

const desktopLayout = window.matchMedia('(min-width: 761px)');
function syncLayoutPosition(event = desktopLayout) {
  let previousLayout = '';
  try { previousLayout = sessionStorage.getItem('sabor-brasileiro-layout') ?? ''; } catch { /* Storage may be unavailable. */ }
  if (!event.matches && previousLayout === 'desktop') window.scrollTo(0, 0);
  try { sessionStorage.setItem('sabor-brasileiro-layout', event.matches ? 'desktop' : 'mobile'); } catch { /* Storage may be unavailable. */ }
}
syncLayoutPosition();
desktopLayout.addEventListener('change', syncLayoutPosition);
window.addEventListener('pageshow', () => {
  const navigation = performance.getEntriesByType('navigation')[0];
  if (!desktopLayout.matches && !location.hash && navigation?.type !== 'back_forward') window.scrollTo(0, 0);
});

updateCart();
loadMenu().catch(() => {
  $('#product-grid').innerHTML = '<div class="empty-menu glass-panel"><h3>Não conseguimos abrir o cardápio agora.</h3><p>Atualize a página para tentar novamente.</p></div>';
});
