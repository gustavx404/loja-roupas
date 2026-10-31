import { getStore } from '@netlify/blobs';

const contentTypes = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export default async function handler(request) {
  const key = new URL(request.url).pathname.slice('/media/'.length);
  const match = /^([a-f0-9-]{36})\.(jpg|png|webp)$/.exec(key);
  if (request.method !== 'GET' || !match) return new Response('Não encontrado.', { status: 404 });
  const type = contentTypes[match[2]];
  const store = getStore({ name: 'sabor-brasileiro-media', consistency: 'strong' });
  const data = await store.get(key, { type: 'arrayBuffer', consistency: 'strong' });
  if (!data) return new Response('Não encontrado.', { status: 404 });
  return new Response(data, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const config = { path: '/media/*' };
