// Public: serves product photos uploaded from /admin.
export async function onRequestGet({ params, env }) {
  const row = await env.DB.prepare('SELECT mime, data FROM images WHERE id=?').bind(params.id).first();
  if (!row) return new Response('Not found', { status: 404 });
  const bin = Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0));
  return new Response(bin, {
    headers: { 'Content-Type': row.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
}
