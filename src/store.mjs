import { createClient } from '@supabase/supabase-js';
import { emptyCatalog, normalizeCatalog } from './catalog.mjs';

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SECRET_KEY no ambiente do servidor.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

function result({ data, error }) {
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data;
}

export async function createStore() {
  const supabase = createSupabaseClient();
  return {
    async getCatalog() {
      const row = result(await supabase.from('app_catalog').select('body').eq('id', 1).maybeSingle());
      return row ? normalizeCatalog(row.body) : emptyCatalog();
    },
    async saveCatalog(catalog) {
      const clean = normalizeCatalog(catalog);
      result(await supabase.from('app_catalog').upsert({ id: 1, body: clean }));
      return clean;
    },
    async getAdministrator() {
      const admin = result(await supabase.from('administrator').select('username,salt,password_hash,must_change_password').eq('id', 1).maybeSingle());
      return admin ? { username: admin.username, salt: admin.salt, passwordHash: admin.password_hash, mustChangePassword: admin.must_change_password } : null;
    },
    async createAdministrator(username, salt, passwordHash) {
      result(await supabase.from('administrator').upsert({ id: 1, username, salt, password_hash: passwordHash, must_change_password: true }));
    },
    async updateAdministratorPassword(salt, passwordHash) {
      result(await supabase.from('administrator').update({ salt, password_hash: passwordHash, must_change_password: false }).eq('id', 1));
    },
    async resetAdministratorPassword(salt, passwordHash) {
      result(await supabase.from('administrator').update({ salt, password_hash: passwordHash, must_change_password: true }).eq('id', 1));
      await this.deleteAllSessions();
    },
    async createSession(tokenHash, username, expiresAt) {
      result(await supabase.from('administrator_session').insert({ token_hash: tokenHash, username, expires_at: expiresAt }));
    },
    async getSession(tokenHash) {
      return result(await supabase.from('administrator_session').select('username').eq('token_hash', tokenHash).gt('expires_at', new Date().toISOString()).maybeSingle());
    },
    async deleteSession(tokenHash) {
      result(await supabase.from('administrator_session').delete().eq('token_hash', tokenHash));
    },
    async deleteAllSessions() {
      result(await supabase.from('administrator_session').delete().not('token_hash', 'is', null));
    },
    async clearExpiredSessions() {
      result(await supabase.from('administrator_session').delete().lt('expires_at', new Date().toISOString()));
    },
    async uploadMedia(name, data, contentType) {
      result(await supabase.storage.from('store-media').upload(name, data, { contentType, upsert: false }));
      return `/media/${name}`;
    },
    async getMedia(name) {
      const { data, error } = await supabase.storage.from('store-media').download(name);
      if (error && error.message.toLowerCase().includes('not found')) return null;
      if (error) throw new Error(`Supabase Storage: ${error.message}`);
      return new Uint8Array(await data.arrayBuffer());
    },
  };
}

let defaultStore;
export function getStore() {
  defaultStore ??= createStore();
  return defaultStore;
}
