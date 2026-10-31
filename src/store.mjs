import { getDatabase } from '@netlify/database';
import { emptyCatalog, normalizeCatalog } from './catalog.mjs';

let defaultStore;

export async function createStore({ connectionString } = {}) {
  const db = getDatabase(connectionString ? { connectionString } : undefined);
  await db.sql`CREATE TABLE IF NOT EXISTS app_catalog (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    body JSONB NOT NULL
  )`;
  await db.sql`CREATE TABLE IF NOT EXISTS administrator (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    username VARCHAR(32) NOT NULL UNIQUE,
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE
  )`;
  await db.sql`CREATE TABLE IF NOT EXISTS administrator_session (
    token_hash CHAR(64) PRIMARY KEY,
    username VARCHAR(32) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
  )`;
  await db.sql`INSERT INTO app_catalog (id, body) VALUES (1, ${JSON.stringify(emptyCatalog())}::jsonb) ON CONFLICT (id) DO NOTHING`;

  return {
    async getCatalog() {
      const [row] = await db.sql`SELECT body FROM app_catalog WHERE id = 1`;
      return normalizeCatalog(typeof row.body === 'string' ? JSON.parse(row.body) : row.body);
    },
    async saveCatalog(catalog) {
      const clean = normalizeCatalog(catalog);
      await db.sql`UPDATE app_catalog SET body = ${JSON.stringify(clean)}::jsonb WHERE id = 1`;
      return clean;
    },
    async getAdministrator() {
      const [admin] = await db.sql`SELECT username, salt, password_hash AS "passwordHash", must_change_password AS "mustChangePassword" FROM administrator WHERE id = 1`;
      return admin ?? null;
    },
    async createAdministrator(username, salt, passwordHash) {
      await db.sql`INSERT INTO administrator (id, username, salt, password_hash, must_change_password) VALUES (1, ${username}, ${salt}, ${passwordHash}, TRUE)`;
    },
    async updateAdministratorPassword(salt, passwordHash) {
      await db.sql`UPDATE administrator SET salt = ${salt}, password_hash = ${passwordHash}, must_change_password = FALSE WHERE id = 1`;
    },
    async resetAdministratorPassword(salt, passwordHash) {
      await db.sql`UPDATE administrator SET salt = ${salt}, password_hash = ${passwordHash}, must_change_password = TRUE WHERE id = 1`;
      await db.sql`DELETE FROM administrator_session`;
    },
    async createSession(tokenHash, username, expiresAt) {
      await db.sql`INSERT INTO administrator_session (token_hash, username, expires_at) VALUES (${tokenHash}, ${username}, ${expiresAt})`;
    },
    async getSession(tokenHash) {
      const [session] = await db.sql`SELECT username FROM administrator_session WHERE token_hash = ${tokenHash} AND expires_at > NOW()`;
      return session ?? null;
    },
    async deleteSession(tokenHash) {
      await db.sql`DELETE FROM administrator_session WHERE token_hash = ${tokenHash}`;
    },
    async deleteAllSessions() {
      await db.sql`DELETE FROM administrator_session`;
    },
    async clearExpiredSessions() {
      await db.sql`DELETE FROM administrator_session WHERE expires_at <= NOW()`;
    },
  };
}

export function getStore(options = {}) {
  if (options.connectionString) return createStore(options);
  defaultStore ??= createStore();
  return defaultStore;
}
