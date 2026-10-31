import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createStore } from '../src/store.mjs';

const scrypt = promisify(scryptCallback);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

try {
  let connectionString = process.env.NETLIFY_DB_URL;
  if (!connectionString) {
    const netlifyCli = resolve(root, 'node_modules/.bin/netlify');
    const result = spawnSync(netlifyCli, ['database', 'connect', '--json'], { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) throw new Error('Não encontrei o banco local. Inicie `npm run dev` antes de redefinir a senha.');
    try { connectionString = JSON.parse(result.stdout.slice(result.stdout.indexOf('{'))).connection_string; }
    catch { throw new Error('O Netlify CLI não retornou uma conexão válida para o banco local.'); }
  }

  const store = await createStore({ connectionString });
  const administrator = await store.getAdministrator();
  if (!administrator) throw new Error('A conta administrativa ainda não foi criada.');

  const password = randomBytes(24).toString('base64url');
  const salt = randomBytes(16).toString('hex');
  const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
  await store.resetAdministratorPassword(salt, passwordHash);

  const credentialsPath = resolve(root, 'data/admin-initial-credentials.json');
  mkdirSync(resolve(root, 'data'), { recursive: true, mode: 0o700 });
  writeFileSync(credentialsPath, `${JSON.stringify({ username: administrator.username, password })}\n`, { mode: 0o600 });
  chmodSync(credentialsPath, 0o600);
  process.stdout.write(`${JSON.stringify({ username: administrator.username, password })}\n`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
