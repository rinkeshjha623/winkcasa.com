// Sends transactional email through whichever free provider has a key in Cloudflare secrets:
//   RESEND_API_KEY (resend.com, free tier) or BREVO_API_KEY (brevo.com, free tier).
// MAIL_FROM is optional (default "WinkCasa <support@winkcasa.com>"); the domain must be verified with the provider.
export const mailReady = (env) => !!(env.RESEND_API_KEY || env.BREVO_API_KEY);

export async function sendMail(env, { to, subject, html, text }) {
  const from = env.MAIL_FROM || 'WinkCasa <support@winkcasa.com>';
  if (env.RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, html, text }) });
    if (!r.ok) throw new Error('mail ' + r.status);
    return true;
  }
  if (env.BREVO_API_KEY) {
    const m = from.match(/^(.*)<(.+)>$/); const sender = m ? { name: m[1].trim(), email: m[2].trim() } : { email: from };
    const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ sender, to: [{ email: to }], subject, htmlContent: html, textContent: text }) });
    if (!r.ok) throw new Error('mail ' + r.status);
    return true;
  }
  throw new Error('mail not configured');
}
