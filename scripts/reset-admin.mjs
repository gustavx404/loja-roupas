import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { createStore } from '../src/store.mjs';

if (existsSync('.env')) process.loadEnvFile('.env');

const scrypt = promisify(scryptCallback);

try {
  if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error('Defina SUPABASE_URL e SUPABASE_SECRET_KEY. A redefinição será feita no banco apontado por essas variáveis.');
  }
  const store = await createStore();
  const existing = await store.getAdministrator();
  const username = existing?.username ?? 'admin';
  const password = randomBytes(24).toString('base64url');
  const salt = randomBytes(16).toString('hex');
  const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
  if (existing) await store.resetAdministratorPassword(salt, passwordHash);
  else await store.createAdministrator(username, salt, passwordHash);
  const credentialsPath = resolve('data/admin-initial-credentials.json');
  mkdirSync(resolve('data'), { recursive: true, mode: 0o700 });
  writeFileSync(credentialsPath, `${JSON.stringify({ username, password })}\n`, { mode: 0o600 });
  chmodSync(credentialsPath, 0o600);
  console.log(JSON.stringify({ username, password }));
  console.log('A senha temporária está em data/admin-initial-credentials.json; troque-a ao entrar e apague o arquivo.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
