const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const state = { catalog: null, administrator: null, activeTab: 'products' };

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options });
  const body = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
  if (!response.ok) throw Object.assign(new Error(body?.error ?? 'Não foi possível concluir a operação.'), { status: response.status });
  return body;
}

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('is-visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('is-visible'), 2600);
}

const adminTabCopy = {
  products: ['PRODUTOS', 'Peças da sua loja.', 'Cadastre, atualize e organize o que está à venda.'],
  categories: ['CATEGORIAS', 'Organize sua vitrine.', 'Agrupe as peças para facilitar a escolha dos clientes.'],
  appearance: ['APARÊNCIA', 'Deixe a loja com a sua cara.', 'Edite a apresentação e as imagens da página inicial.'],
  settings: ['CONFIGURAÇÕES', 'Dados da sua loja.', 'Atualize seu nome, WhatsApp e informações de entrega.'],
};

function setActiveTab(tab) {
  if (!adminTabCopy[tab]) return;
  state.activeTab = tab;
  $$('[data-admin-tab]').forEach((button) => {
    const active = button.dataset.adminTab === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $$('[data-admin-panel]').forEach((panel) => { panel.hidden = panel.dataset.adminPanel !== tab; });
  if (tab !== 'products') $('#product-editor').hidden = true;
  const [eyebrow, title, description] = adminTabCopy[tab];
  $('#dashboard-eyebrow').textContent = eyebrow;
  $('#dashboard-title').textContent = title;
  $('#dashboard-description').textContent = description;
}

function setSignedIn(account) {
  state.administrator = account?.administrator ? account : null;
  const isSignedIn = Boolean(state.administrator);
  const mustChangePassword = Boolean(state.administrator?.mustChangePassword);
  $('#login-card').hidden = isSignedIn;
  $('#dashboard').hidden = !isSignedIn;
  $('#dashboard-eyebrow').textContent = mustChangePassword ? 'PRIMEIRO ACESSO' : 'GESTÃO DA LOJA';
  $('#dashboard-title').textContent = mustChangePassword ? 'Proteja sua conta.' : 'Sua loja, do seu jeito.';
  $('#dashboard-description').textContent = mustChangePassword ? 'Troque a senha inicial para liberar o painel.' : 'Gerencie as peças e mantenha sua vitrine sempre atualizada.';
  $('#dashboard-content').hidden = mustChangePassword;
  $('#show-password-button').hidden = mustChangePassword;
  $('#password-title').textContent = mustChangePassword ? 'Crie sua senha pessoal' : 'Alterar senha';
  $('#password-description').textContent = mustChangePassword ? 'Defina uma senha pessoal com pelo menos 14 caracteres para liberar as ferramentas da loja.' : 'Use uma senha exclusiva com pelo menos 14 caracteres.';
  $('#cancel-password').hidden = mustChangePassword;
  $('#logout-first-access').hidden = !mustChangePassword;
  $('#refresh-password-status').hidden = !mustChangePassword;
  if (mustChangePassword && !$('#password-dialog').open) $('#password-dialog').showModal();
  if (!isSignedIn && $('#password-dialog').open) $('#password-dialog').close();
  if (isSignedIn && !mustChangePassword) {
    setActiveTab(state.activeTab);
    loadCatalog().catch((error) => toast(error.message));
  }
}

async function loadCatalog() {
  state.catalog = await api('/api/admin/catalog');
  $('#restaurant-name').value = state.catalog.restaurant.name;
  $('#restaurant-whatsapp').value = state.catalog.restaurant.whatsapp;
  $('#restaurant-hours').value = state.catalog.restaurant.hours;
  $('#announcement-text').value = state.catalog.restaurant.announcement ?? '';
  $('#hero-title-text').value = state.catalog.restaurant.heroTitle ?? '';
  $('#hero-description-text').value = state.catalog.restaurant.heroDescription ?? '';
  $('#hero-image-url').value = state.catalog.restaurant.heroImageUrl ?? '';
  $('#favicon-image-url').value = state.catalog.restaurant.faviconUrl ?? '';
  $('#hero-image-preview').src = state.catalog.restaurant.heroImageUrl ?? '';
  $('#hero-image-preview').hidden = !state.catalog.restaurant.heroImageUrl;
  $('#favicon-image-preview').src = state.catalog.restaurant.faviconUrl ?? '';
  $('#favicon-image-preview').hidden = !state.catalog.restaurant.faviconUrl;
  const faviconUrl = state.catalog.restaurant.faviconUrl || '/favicon.svg';
  const versionedFavicon = `${faviconUrl}${faviconUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(faviconUrl)}`;
  document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach((link) => { link.href = versionedFavicon; });
  renderCategories();
  renderProducts();
}

async function saveCatalog(message) {
  try {
    state.catalog = await api('/api/admin/catalog', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state.catalog) });
    renderCategories();
    renderProducts();
    if (message) toast(message);
  } catch (error) {
    await loadCatalog().catch(() => {});
    throw error;
  }
}

function renderCategories() {
  const list = $('#category-admin-list');
  list.innerHTML = state.catalog.categories.map((category) => `<li class="category-admin-item"><span>${escapeHtml(category.name)}</span><button type="button" data-delete-category="${escapeHtml(category.id)}">Remover</button></li>`).join('');
  const select = $('#product-category');
  const currentValue = select.value;
  select.innerHTML = '<option value="">Sem categoria</option>' + state.catalog.categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`).join('');
  if (state.catalog.categories.some((category) => category.id === currentValue)) select.value = currentValue;
}

function renderProducts() {
  $('#product-count').textContent = String(state.catalog.products.length);
  $('#admin-product-list').innerHTML = state.catalog.products.length ? state.catalog.products.map((product) => {
    const category = state.catalog.categories.find((item) => item.id === product.categoryId);
    return `<article class="admin-product-row">
      <div class="admin-product-main">${product.imageUrl ? `<img class="admin-thumb" src="${escapeHtml(product.imageUrl)}" alt="" loading="lazy">` : '<span class="admin-thumb" aria-hidden="true"></span>'}
        <div class="admin-product-title"><span class="admin-product-name">${escapeHtml(product.name)}</span><small>${escapeHtml(category?.name ?? 'Sem categoria')} · ${product.priceOnRequest ? 'Sob consulta' : money.format(product.priceCents / 100)}${product.available ? '' : ' · Indisponível'}</small></div>
      </div><div class="admin-row-actions"><button type="button" data-toggle-product="${escapeHtml(product.id)}" class="${product.available ? '' : 'unavailable-action'}">${product.available ? 'Marcar indisponível' : 'Marcar disponível'}</button><button type="button" data-edit-product="${escapeHtml(product.id)}">Editar</button><button type="button" data-delete-product="${escapeHtml(product.id)}">Excluir</button></div>
    </article>`;
  }).join('') : '<div class="catalog-empty"><span>✳</span><strong>Sua vitrine começa aqui</strong><p>Cadastre sua primeira peça para organizar o catálogo.</p></div>';
}

function showEditor(product = null) {
  const form = $('#product-form');
  form.reset();
  $('#product-error').textContent = '';
  $('#product-id').value = product?.id ?? '';
  $('#editor-title').textContent = product ? 'Editar peça' : 'Nova peça';
  $('#product-name').value = product?.name ?? '';
  $('#product-description').value = product?.description ?? '';
  $('#product-price-on-request').checked = product?.priceOnRequest ?? false;
  $('#product-price').disabled = $('#product-price-on-request').checked;
  $('#product-price').required = !$('#product-price-on-request').checked;
  $('#product-price').value = product && !product.priceOnRequest ? money.format(product.priceCents / 100).replace('R$', '').trim() : '';
  renderCategories();
  $('#product-category').value = product?.categoryId ?? '';
  $('#product-available').checked = product?.available ?? true;
  $('#product-image-url').value = product?.imageUrl ?? '';
  $('#product-image').value = '';
  updateImagePreview(product?.imageUrl ?? '');
  $('#product-removals').value = (product?.removals ?? []).join('\n');
  $('#modifier-groups').innerHTML = '';
  (product?.modifierGroups ?? []).forEach((group) => addModifierGroup(group));
  $('#product-editor').hidden = false;
  $('#product-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#product-name').focus({ preventScroll: true });
}

function closeEditor() {
  $('#product-editor').hidden = true;
}

function addModifierGroup(group = null) {
  const id = group?.id ?? crypto.randomUUID();
  const node = document.createElement('section');
  node.className = 'modifier-group-editor';
  node.dataset.groupId = id;
  node.innerHTML = `<div class="modifier-group-header"><input data-group-name aria-label="Nome do grupo de opções" placeholder="Ex.: Tamanho" maxlength="80" value="${escapeHtml(group?.name ?? '')}" required><button class="remove-group-button" data-remove-group type="button" aria-label="Remover grupo">×</button></div>
    <div class="group-flags"><label><input data-group-required type="checkbox" ${group?.required ? 'checked' : ''}> Escolha obrigatória</label><label><input data-group-multiple type="checkbox" ${group && group.max > 1 ? 'checked' : ''}> Permitir várias opções</label></div>
    <div data-options></div><button class="text-button add-option-button" data-add-option type="button">+ Adicionar opção</button>`;
  $('#modifier-groups').append(node);
  (group?.options?.length ? group.options : [{ name: '', priceCents: 0 }]).forEach((option) => addModifierOption(node, option));
}

function addModifierOption(groupNode, option = null) {
  const node = document.createElement('div');
  node.className = 'modifier-option-row';
  node.innerHTML = `<input data-option-name aria-label="Nome da opção" placeholder="Ex.: P, M, G ou GG" maxlength="80" value="${escapeHtml(option?.name ?? '')}"><input data-option-price inputmode="decimal" aria-label="Acréscimo no preço" placeholder="0,00" value="${option ? (option.priceCents / 100).toFixed(2).replace('.', ',') : ''}"><button data-remove-option type="button" aria-label="Remover opção">×</button>`;
  groupNode.querySelector('[data-options]').append(node);
}

function parseCents(value) {
  const normalized = String(value).trim().replace(/R\$\s?/i, '').replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function readModifierGroups() {
  return $$('.modifier-group-editor', $('#modifier-groups')).map((group) => ({
    id: group.dataset.groupId,
    name: $('[data-group-name]', group).value.trim(),
    required: $('[data-group-required]', group).checked,
    multiple: $('[data-group-multiple]', group).checked,
    options: $$('[data-options] .modifier-option-row', group).map((option) => ({
      id: crypto.randomUUID(),
      name: $('[data-option-name]', option).value.trim(),
      priceCents: parseCents($('[data-option-price]', option).value),
      available: true,
    })),
  }));
}

function updateImagePreview(url) {
  const image = $('#image-preview');
  image.hidden = !url;
  image.src = url || '';
}

async function uploadImage(file, urlSelector = '#product-image-url', previewSelector = '#image-preview') {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
  if (file.size > 2 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 2 MB.');
  const body = await api('/api/admin/media', { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
  $(urlSelector).value = body.imageUrl;
  const preview = $(previewSelector);
  preview.src = body.imageUrl;
  preview.hidden = false;
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const loginForm = event.currentTarget;
  const error = $('#login-error');
  error.textContent = '';
  const form = new FormData(loginForm);
  try {
    const result = await api('/api/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) });
    loginForm.reset();
    setSignedIn(result);
  } catch (reason) {
    error.textContent = reason.status === 503 ? 'Crie a conta no terminal enquanto npm run dev estiver rodando.' : reason.message;
  }
});

$$('[data-admin-tab]').forEach((button) => button.addEventListener('click', () => setActiveTab(button.dataset.adminTab)));

$('#logout-button').addEventListener('click', async () => {
  try {
    await api('/api/admin/logout', { method: 'POST' });
    setSignedIn(null);
  } catch (error) {
    toast(error.message);
  }
});

$('#show-password-button').addEventListener('click', () => {
  $('#password-error').textContent = '';
  $('#password-form').reset();
  $('#password-dialog').showModal();
});

$('#cancel-password').addEventListener('click', () => {
  if (state.administrator?.mustChangePassword) return;
  $('#password-dialog').close();
});

$('#logout-first-access').addEventListener('click', async () => {
  try {
    await api('/api/admin/logout', { method: 'POST' });
    setSignedIn(null);
  } catch (error) {
    toast(error.message);
  }
});

$('#refresh-password-status').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const session = await api('/api/admin/session');
    if (session.administrator) setSignedIn(session);
    else {
      setSignedIn(null);
      toast('Sua sessão expirou. Entre novamente.');
    }
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
  }
});

$('#password-dialog').addEventListener('cancel', (event) => {
  if (state.administrator?.mustChangePassword) event.preventDefault();
});

$('#password-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const currentPassword = String(form.get('currentPassword'));
  const newPassword = String(form.get('newPassword'));
  const confirmPassword = String(form.get('confirmPassword'));
  const errorNode = $('#password-error');
  errorNode.textContent = '';
  if (newPassword !== confirmPassword) {
    errorNode.textContent = 'As novas senhas não conferem.';
    return;
  }
  try {
    await api('/api/admin/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword, confirmPassword }) });
    $('#password-dialog').close();
    event.currentTarget.reset();
    setSignedIn({ administrator: state.administrator.administrator, mustChangePassword: false });
    toast('Senha alterada.');
  } catch (error) {
    errorNode.textContent = error.message;
  }
});

$('#settings-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  state.catalog.restaurant = {
    ...state.catalog.restaurant,
    name: $('#restaurant-name').value.trim(),
    whatsapp: $('#restaurant-whatsapp').value.replace(/\D/g, ''),
    hours: $('#restaurant-hours').value.trim(),
  };
  try { await saveCatalog('Informações atualizadas.'); } catch (error) { toast(error.message); }
});

$('#appearance-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  state.catalog.restaurant = {
    ...state.catalog.restaurant,
    announcement: $('#announcement-text').value.trim(),
    heroTitle: $('#hero-title-text').value.trim(),
    heroDescription: $('#hero-description-text').value.trim(),
    heroImageUrl: $('#hero-image-url').value || '/images/hero-set.png',
    faviconUrl: $('#favicon-image-url').value || '/favicon.svg',
  };
  try { await saveCatalog('Aparência atualizada.'); }
  catch (error) { toast(error.message); }
});

$('#category-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('#category-name');
  const name = input.value.trim();
  if (!name) return;
  state.catalog.catalogManaged = true;
  state.catalog.categories.push({ id: crypto.randomUUID(), name });
  try {
    await saveCatalog('Categoria adicionada.');
    input.value = '';
  } catch (error) { toast(error.message); }
});

$('#category-admin-list').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-delete-category]');
  if (!button) return;
  const id = button.dataset.deleteCategory;
  if (state.catalog.products.some((product) => product.categoryId === id)) {
    toast('Mova os produtos para outra categoria antes de removê-la.');
    return;
  }
  state.catalog.catalogManaged = true;
  state.catalog.categories = state.catalog.categories.filter((category) => category.id !== id);
  try { await saveCatalog('Categoria removida.'); } catch (error) { toast(error.message); }
});

$('#new-product-button').addEventListener('click', () => showEditor());
$('#product-price-on-request').addEventListener('change', (event) => {
  $('#product-price').disabled = event.currentTarget.checked;
  $('#product-price').required = !event.currentTarget.checked;
});
$('#close-editor').addEventListener('click', closeEditor);
$('#cancel-product').addEventListener('click', closeEditor);

$('#admin-product-list').addEventListener('click', async (event) => {
  const edit = event.target.closest('[data-edit-product]');
  const toggle = event.target.closest('[data-toggle-product]');
  const remove = event.target.closest('[data-delete-product]');
  if (edit) showEditor(state.catalog.products.find((item) => item.id === edit.dataset.editProduct));
  if (toggle) {
    const product = state.catalog.products.find((item) => item.id === toggle.dataset.toggleProduct);
    if (!product) return;
    state.catalog.catalogManaged = true;
    product.available = !product.available;
    try { await saveCatalog(product.available ? 'Produto disponível.' : 'Produto marcado como indisponível.'); } catch (error) { toast(error.message); }
  }
  if (remove) {
    state.catalog.catalogManaged = true;
    state.catalog.products = state.catalog.products.filter((item) => item.id !== remove.dataset.deleteProduct);
    try { await saveCatalog('Produto removido.'); } catch (error) { toast(error.message); }
  }
});

$('#add-group-button').addEventListener('click', () => addModifierGroup());
$('#modifier-groups').addEventListener('click', (event) => {
  const group = event.target.closest('.modifier-group-editor');
  if (!group) return;
  if (event.target.closest('[data-remove-group]')) group.remove();
  if (event.target.closest('[data-add-option]')) addModifierOption(group);
  if (event.target.closest('[data-remove-option]')) event.target.closest('.modifier-option-row').remove();
});

$('#product-image').addEventListener('change', async (event) => {
  try {
    await uploadImage(event.currentTarget.files[0]);
    toast('Foto enviada. Salve o produto para aplicar.');
  } catch (error) {
    event.currentTarget.value = '';
    toast(error.message);
  }
});

for (const [inputSelector, urlSelector, previewSelector, label] of [
  ['#hero-image', '#hero-image-url', '#hero-image-preview', 'Imagem de destaque enviada. Salve a aparência para aplicar.'],
  ['#favicon-image', '#favicon-image-url', '#favicon-image-preview', 'Favicon enviado. Salve a aparência para aplicar.'],
]) {
  $(inputSelector).addEventListener('change', async (event) => {
    try {
      await uploadImage(event.currentTarget.files[0], urlSelector, previewSelector);
      toast(label);
    } catch (error) {
      event.currentTarget.value = '';
      toast(error.message);
    }
  });
}

$('#product-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorNode = $('#product-error');
  errorNode.textContent = '';
  const groups = readModifierGroups();
  const priceOnRequest = $('#product-price-on-request').checked;
  const priceCents = priceOnRequest ? null : parseCents($('#product-price').value);
  if (!priceOnRequest && priceCents === null) {
    errorNode.textContent = 'Informe um preço válido, por exemplo 24,90.';
    return;
  }
  if (groups.some((group) => !group.name || !group.options.length || group.options.some((option) => !option.name || option.priceCents === null))) {
    errorNode.textContent = 'Preencha o nome de cada grupo e opção, e confira os preços adicionais.';
    return;
  }
  const current = state.catalog.products.find((product) => product.id === $('#product-id').value);
  const product = {
    id: current?.id ?? crypto.randomUUID(),
    categoryId: $('#product-category').value,
    name: $('#product-name').value.trim(),
    description: $('#product-description').value.trim(),
    priceCents,
    priceOnRequest,
    imageUrl: $('#product-image-url').value,
    available: $('#product-available').checked,
    modifierGroups: groups,
    removals: $('#product-removals').value.split('\n').map((line) => line.trim()).filter(Boolean),
  };
  if (current) state.catalog.products = state.catalog.products.map((item) => item.id === current.id ? product : item);
  else state.catalog.products.push(product);
  state.catalog.catalogManaged = true;
  try {
    await saveCatalog('Peça salva na loja.');
    closeEditor();
  } catch (error) {
    errorNode.textContent = error.message;
  }
});

api('/api/admin/session').then(setSignedIn).catch(() => setSignedIn(null));
