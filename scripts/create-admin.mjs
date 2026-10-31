import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { promisify } from 'node:util';
import { createStore } from '../src/store.mjs';

if (existsSync('.env')) process.loadEnvFile('.env');

const scrypt = promisify(scryptCallback);

async function hidden(prompt) {
  if (!stdin.isTTY || !stdin.setRawMode) throw new Error('Use um terminal interativo ou ADMIN_CREDENTIALS_FILE.');
  stdout.write(prompt);
  stdin.setRawMode(true); stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const done = (error) => { stdin.off('data', onData); stdin.setRawMode(false); stdout.write('\n'); error ? reject(error) : resolve(value); };
    const onData = chunk => { for (const char of chunk.toString()) { if (char === '\u0003') return done(new Error('Cancelado.')); if (char === '\r' || char === '\n') return done(); if (char === '\u007f' || char === '\b') value = value.slice(0, -1); else if (char >= ' ') value += char; } };
    stdin.on('data', onData);
  });
}

try {
  if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error('Defina SUPABASE_URL e SUPABASE_SECRET_KEY no ambiente antes de executar.');
  }
  const store = await createStore();
  if (await store.getAdministrator()) throw new Error('Já existe uma conta. Use npm run admin:reset.');
  let username, password, confirmation;
  if (process.env.ADMIN_CREDENTIALS_FILE) {
    const credentials = JSON.parse(readFileSync(process.env.ADMIN_CREDENTIALS_FILE, 'utf8'));
    username = String(credentials.username ?? '').trim().toLowerCase(); password = String(credentials.password ?? ''); confirmation = password;
  } else {
    const rl = createInterface({ input: stdin, output: stdout });
    username = (await rl.question('Usuário administrador: ')).trim().toLowerCase(); rl.close();
    password = await hidden('Senha (mínimo 14 caracteres): '); confirmation = await hidden('Confirme a senha: ');
  }
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) throw new Error('Usuário: 3–32 caracteres, letras minúsculas, números, ponto, hífen ou sublinhado.');
  if (password.length < 14) throw new Error('A senha precisa ter pelo menos 14 caracteres.');
  if (password !== confirmation) throw new Error('As senhas não conferem.');
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  await store.createAdministrator(username, salt, hash);
  stdout.write('Conta administrativa criada.\n');
} catch (error) { console.error(error.message); process.exitCode = 1; }
