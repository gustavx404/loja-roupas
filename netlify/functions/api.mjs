import { handleApi } from '../../src/api.mjs';

export default function handler(request, context) {
  return handleApi(request, context);
}

export const config = { path: '/api/*' };
