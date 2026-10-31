import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SESSION_MS = 8 * 60 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map();
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export function createAuth(store) {
  return {
    async login(username, password, ip) {
      const now = Date.now();
      const attempt = attempts.get(ip);
      if (attempt?.lockedUntil > now) return null;
      if (attempt && now - attempt.startedAt > WINDOW_MS) attempts.delete(ip);

      const admin = await store.getAdministrator();
      if (!admin) return null;
      const candidate = await scrypt(String(password).slice(0, 1024), admin.salt, 64);
      const expected = Buffer.from(admin.passwordHash, 'hex');
      const matches = candidate.length === expected.length && timingSafeEqual(candidate, expected);
      if (matches && username === admin.username) {
        attempts.delete(ip);
        const token = randomBytes(32).toString('base64url');
        await store.clearExpiredSessions();
        await store.createSession(hashToken(token), admin.username, new Date(now + SESSION_MS).toISOString());
        return { token, mustChangePassword: admin.mustChangePassword };
      }

      const current = attempts.get(ip) ?? { startedAt: now, count: 0, lockedUntil: 0 };
      current.count += 1;
      if (current.count >= MAX_ATTEMPTS) current.lockedUntil = now + WINDOW_MS;
      attempts.set(ip, current);
      return null;
    },
    async session(token) {
      if (!token) return null;
      const active = await store.getSession(hashToken(token));
      if (!active) return null;
      const admin = await store.getAdministrator();
      if (!admin || active.username !== admin.username) return null;
      return { username: admin.username, mustChangePassword: admin.mustChangePassword };
    },
    async changePassword(token, currentPassword, newPassword) {
      const current = await this.session(token);
      if (!current) return null;
      const admin = await store.getAdministrator();
      const candidate = await scrypt(String(currentPassword).slice(0, 1024), admin.salt, 64);
      const expected = Buffer.from(admin.passwordHash, 'hex');
      if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return null;

      const salt = randomBytes(16).toString('hex');
      const passwordHash = (await scrypt(newPassword, salt, 64)).toString('hex');
      await store.updateAdministratorPassword(salt, passwordHash);
      await store.deleteAllSessions();
      const nextToken = randomBytes(32).toString('base64url');
      await store.createSession(hashToken(nextToken), admin.username, new Date(Date.now() + SESSION_MS).toISOString());
      return nextToken;
    },
    async logout(token) {
      if (token) await store.deleteSession(hashToken(token));
    },
  };
}
