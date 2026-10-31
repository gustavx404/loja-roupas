import { randomUUID } from 'node:crypto';
import { createAuth } from './auth.mjs';
import { publicCatalog } from './catalog.mjs';
import { getStore } from './store.mjs';

const maxJsonBytes = 256 * 1024;
const maxImageBytes = 2 * 1024 * 1024;
const mimeByType = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);
const mimeByExtension = new Map([...mimeByType].map(([type, extension]) => [extension.slice(1), type]));
const loginAttempts = new Map();

function secureHeaders(headers = {}) {
  const result = new Headers(headers);
  result.set('X-Content-Type-Options', 'nosniff');
  result.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  result.set('X-Frame-Options', 'DENY');
  result.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  result.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  result.set('Cache-Control', 'no-store');
  return result;
}

function json(status, data, headers = {}) {
  const resultHeaders = secureHeaders(headers);
  resultHeaders.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { status, headers: resultHeaders });
}

function fail(status, message) {
  return json(status, { error: message });
}

function getCookie(request, name) {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0 || part.slice(0, index).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return ''; }
  }
  return '';
}

function setSessionCookie(request, token, maxAge = 8 * 60 * 60) {
  const secure = new URL(request.url).protocol === 'https:';
  return `movo_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

async function readJson(request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > maxJsonBytes) throw Object.assign(new Error('A requisição excede o limite permitido.'), { status: 413 });
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxJsonBytes) throw Object.assign(new Error('A requisição excede o limite permitido.'), { status: 413 });
  try { return JSON.parse(body); } catch { throw Object.assign(new Error('JSON inválido.'), { status: 400 }); }
}

function validImage(data, type) {
  if (type === 'image/png') return data.length > 8 && Buffer.from(data.slice(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === 'image/jpeg') return data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9;
  return type === 'image/webp' && data.length > 12 && String.fromCharCode(...data.slice(0, 4)) === 'RIFF' && String.fromCharCode(...data.slice(8, 12)) === 'WEBP';
}

function loginLocked(ip) {
  const attempt = loginAttempts.get(ip);
  if (!attempt) return false;
  const now = Date.now();
  if (attempt.lockedUntil > now) return true;
  if (now - attempt.startedAt > 15 * 60 * 1000) loginAttempts.delete(ip);
  return false;
}

function recordLoginFailure(ip) {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  const current = !attempt || now - attempt.startedAt > 15 * 60 * 1000 ? { startedAt: now, count: 0, lockedUntil: 0 } : attempt;
  current.count += 1;
  if (current.count >= 8) current.lockedUntil = now + 15 * 60 * 1000;
  loginAttempts.set(ip, current);
}

let runtime;
async function getRuntime() {
  runtime ??= getStore().then((store) => ({ store, auth: createAuth(store) }));
  return runtime;
}

async function handle(request, context) {
  const url = new URL(request.url);
  const path = url.pathname;
  const { store, auth } = await getRuntime();

  if (request.method === 'GET' && path === '/api/menu') {
    return json(200, publicCatalog(await store.getCatalog()), { 'Cache-Control': 'no-cache' });
  }

  if (request.method === 'GET' && path === '/api/admin/session') {
    const current = await auth.session(getCookie(request, 'movo_session'));
    return json(200, { administrator: current?.username ?? null, mustChangePassword: current?.mustChangePassword ?? false });
  }

  if (request.method === 'POST' && path === '/api/admin/session') {
    if (!sameOrigin(request)) return fail(403, 'Origem da requisição não autorizada.');
    if (!(await store.getAdministrator())) return fail(503, 'O painel ainda não foi configurado.');
    const ip = context.ip ?? 'local';
    if (loginLocked(ip)) return fail(429, 'Muitas tentativas. Aguarde alguns minutos e tente novamente.');
    const body = await readJson(request);
    const session = await auth.login(body.username, body.password, ip);
    if (!session) {
      recordLoginFailure(ip);
      return fail(401, 'Usuário ou senha incorretos. Tente novamente mais tarde.');
    }
    loginAttempts.delete(ip);
    return json(200, { administrator: body.username, mustChangePassword: session.mustChangePassword }, { 'Set-Cookie': setSessionCookie(request, session.token) });
  }

  if (!path.startsWith('/api/admin/')) return fail(404, 'Não encontrado.');
  const token = getCookie(request, 'movo_session');
  const current = await auth.session(token);
  if (!current) return fail(401, 'Entre no painel para continuar.');
  if (request.method !== 'GET' && !sameOrigin(request)) return fail(403, 'Origem da requisição não autorizada.');

  if (request.method === 'POST' && path === '/api/admin/logout') {
    await auth.logout(token);
    return json(200, { ok: true }, { 'Set-Cookie': setSessionCookie(request, '', 0) });
  }

  if (request.method === 'PUT' && path === '/api/admin/password') {
    const body = await readJson(request);
    if (typeof body.newPassword !== 'string' || body.newPassword.length < 14 || body.newPassword.length > 1024) return fail(400, 'A nova senha precisa ter pelo menos 14 caracteres.');
    if (body.newPassword !== body.confirmPassword) return fail(400, 'As novas senhas não conferem.');
    const newToken = await auth.changePassword(token, body.currentPassword, body.newPassword);
    if (!newToken) return fail(401, 'A senha atual está incorreta.');
    return json(200, { ok: true, mustChangePassword: false }, { 'Set-Cookie': setSessionCookie(request, newToken) });
  }

  if (current.mustChangePassword) return fail(403, 'Troque a senha inicial para continuar.');
  if (request.method === 'GET' && path === '/api/admin/catalog') return json(200, await store.getCatalog());
  if (request.method === 'PUT' && path === '/api/admin/catalog') {
    try { return json(200, await store.saveCatalog(await readJson(request))); }
    catch (error) { return fail(400, error.message || 'Não foi possível salvar o cardápio.'); }
  }
  if (request.method === 'POST' && path === '/api/admin/media') {
    const contentType = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const extension = mimeByType.get(contentType);
    if (!extension) return fail(415, 'Envie uma imagem JPG, PNG ou WebP.');
    if (Number(request.headers.get('content-length') ?? 0) > maxImageBytes) return fail(413, 'A imagem deve ter no máximo 2 MB.');
    const data = new Uint8Array(await request.arrayBuffer());
    if (data.length > maxImageBytes) return fail(413, 'A imagem deve ter no máximo 2 MB.');
    if (!validImage(data, contentType)) return fail(400, 'O arquivo não parece ser uma imagem válida.');
    const name = `${randomUUID()}${extension}`;
    const imageUrl = await store.uploadMedia(name, data, contentType);
    return json(201, { imageUrl });
  }
  return fail(404, 'Não encontrado.');
}

export async function handleApi(request, context = {}) {
  try { return await handle(request, context); }
  catch (error) {
    return fail(error.status ?? 500, error.status ? error.message : 'Erro interno.');
  }
}
