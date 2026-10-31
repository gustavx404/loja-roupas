import { getStore } from '../../src/store.mjs';

const contentTypes = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export default async function handler(request) {
  const key = new URL(request.url).pathname.slice('/media/'.length);
  const match = /^([a-f0-9-]{36})\.(jpg|png|webp)$/.exec(key);
  if (request.method !== 'GET' || !match) return new Response('Not found.', { status: 404 });
  const data = await (await getStore()).getMedia(key);
  if (!data) return new Response('Not found.', { status: 404 });
  return new Response(data, { headers: {
    'Content-Type': contentTypes[match[2]],
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  } });
}

export const config = { path: '/media/*' };
