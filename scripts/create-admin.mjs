import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from '../src/store.mjs';

const scrypt = promisify(scryptCallback);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

function askHidden(prompt) {
  return new Promise((resolveAnswer, reject) => {
    if (!stdin.isTTY || !stdin.setRawMode) return reject(new Error('Execute este comando em um terminal interativo.'));
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    let value = '';
    const onData = (chunk) => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') {
          cleanup();
          reject(new Error('Operação cancelada.'));
          return;
        }
        if (char === '\r' || char === '\n') {
          cleanup();
          stdout.write('\n');
          resolveAnswer(value);
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
    };
    stdin.on('data', onData);
  });
}

try {
  let connectionString = process.env.NETLIFY_DB_URL;
  if (!connectionString) {
    const netlifyCli = resolve(root, 'node_modules/.bin/netlify');
    const result = spawnSync(netlifyCli, ['database', 'connect', '--json'], { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) throw new Error('Não encontrei o banco local. Inicie `npm run dev` e rode este comando em outro terminal.');
    try { connectionString = JSON.parse(result.stdout.slice(result.stdout.indexOf('{'))).connection_string; }
    catch { throw new Error('O Netlify CLI não retornou uma conexão válida para o banco local.'); }
  }
  if (!connectionString) throw new Error('NETLIFY_DB_URL não está configurado.');
  const store = await createStore({ connectionString });
  if (await store.getAdministrator()) throw new Error('A conta administrativa já existe.');
  let username;
  let password;
  let confirmation;
  if (process.env.ADMIN_CREDENTIALS_FILE) {
    const credentials = JSON.parse(readFileSync(process.env.ADMIN_CREDENTIALS_FILE, 'utf8'));
    username = String(credentials.username ?? '').trim().toLowerCase();
    password = String(credentials.password ?? '');
    confirmation = password;
  } else {
    if (!stdin.isTTY) throw new Error('Execute em um terminal interativo ou informe ADMIN_CREDENTIALS_FILE.');
    const rl = createInterface({ input: stdin, output: stdout });
    username = (await rl.question('Usuário administrador: ')).trim().toLowerCase();
    rl.close();
    password = await askHidden('Senha (mínimo 14 caracteres): ');
    confirmation = await askHidden('Confirme a senha: ');
  }
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) throw new Error('Use de 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado.');
  if (password.length < 14) throw new Error('A senha precisa ter pelo menos 14 caracteres.');
  if (password !== confirmation) throw new Error('As senhas não conferem.');

  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  await store.createAdministrator(username, salt, hash);
  stdout.write('Conta administrativa criada. O cadastro público permanece desativado.\n');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
