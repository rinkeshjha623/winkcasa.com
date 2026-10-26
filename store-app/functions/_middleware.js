import { maybeRunDue } from '../src/social.js';

// Backup for the scheduler: when someone opens a page and a social post is overdue, publish it.
// GitHub's schedule can run hours late on quiet repositories, so this keeps posts close to their time.
export async function onRequest({ request, env, next, waitUntil }) {
  const res = await next();
  if (request.method === 'GET' && env.DB && (res.headers.get('content-type') || '').includes('text/html')) waitUntil(maybeRunDue(env));
  return res;
}
