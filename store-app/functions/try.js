import { getSettings, activeProducts, categoriesOf } from '../src/store.js';
import { SITE, headTags, pageShell } from '../src/seo.js';

// /try — "Find your look": on-device face-shape detection, placement guide and product picks.
export async function onRequestGet({ env }) {
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const cats = categoriesOf(rows, S);
  const main = `<main class="wrap" id="tryPage"><div class="cathead"><p class="label">Find your look</p><h1>Styled to your face</h1>
<p>Upload or take a selfie and we will read your face shape, show where each piece sits, and suggest earrings, necklaces and hair accessories that suit you.</p></div>
<div class="tryshell"><div class="trystage"><div class="trybox" id="tryBox"><canvas id="tryCanvas" width="640" height="800" aria-label="Your photo with placement guide"></canvas>
<div class="tryempty" id="tryEmpty"><div class="tryicon">✦</div><p>Add a clear, front-facing photo with your hair tucked back so your ears show.</p></div><div class="tryload" id="tryLoad" hidden>Reading your face…</div></div>
<video id="tryVideo" playsinline muted hidden></video>
<div class="trybtns"><label class="btn">Take a selfie<input type="file" id="fSelfie" accept="image/*" capture="user" hidden></label><label class="btn alt">Upload a photo<input type="file" id="fUpload" accept="image/*" hidden></label><button class="btn alt" type="button" id="bCam">Use webcam</button><button class="btn alt" type="button" id="bSnap" hidden>Capture</button></div>
<p class="fine privacy">🔒 Private by design: face detection runs inside your browser. Your photo stays on your device unless you choose to save it after your results.</p></div>
<div class="tryres" id="tryRes"><p class="empty">Your face shape, placement guide and picks will appear here.</p></div></div></main>`;
  const html = pageShell({
    head: headTags({ title: 'Find your look: face shape and jewellery suggestions | WinkCasa', description: 'Upload a selfie to find your face shape and see which earrings, necklaces and hair accessories suit you. Private: your photo never leaves your device.', canonical: SITE + '/try' }),
    S, cats, main, scripts: '<script src="/try.js" defer></script>',
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
