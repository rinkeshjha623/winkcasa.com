import { getSettings, activeProducts, categoriesOf } from '../src/store.js';
import { SITE, headTags, pageShell, faqLd, breadcrumbLd, esc } from '../src/seo.js';

const FAQ = [
  { q: 'What is the WinkCasa face shape finder?', a: 'Find your look is a free tool that reads your face shape from a selfie, shows where earrings, necklaces, hair clips and facial massage tools sit on your face, and suggests matching pieces from the WinkCasa store.' },
  { q: 'Is my photo uploaded or stored?', a: 'No. Face detection runs inside your browser, so your photo stays on your device. A photo is only saved if you tick the consent box and press Save, and saved photos are deleted automatically after 90 days.' },
  { q: 'Which face shapes does it recognise?', a: 'Oval, round, square, heart and long (oblong). If the suggestion does not feel right, you can switch shape with one tap.' },
  { q: 'Is it accurate?', a: 'It is a styling guide, not an exact measurement. Use a bright, front-facing photo with your hair tucked back for the best result.' },
  { q: 'Which earrings suit my face shape?', a: 'Drops suit round faces, hoops suit square faces, teardrops suit heart-shaped faces, wide hoops and studs suit long faces, and oval faces suit almost anything. See the full earring guide on our blog.' },
];

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
<div class="tryres" id="tryRes"><p class="empty">Your face shape, placement guide and picks will appear here.</p></div></div>
<section class="sec tryinfo"><h2>How Find your look works</h2><figure class="pinfig"><img src="/pins/find-your-look.png" alt="Find your look: free, private face shape finder by WinkCasa" width="400" height="600" loading="lazy"></figure><p>Add a front-facing photo. Your browser detects your face landmarks, compares the width of your forehead, cheekbones and jaw with the length of your face, and suggests a shape. You then see a placement guide and picks from our jewellery, hair accessories and beauty tools.</p><p>Read more: <a href="/blog/earrings-for-your-face-shape">which earrings suit your face shape</a>, <a href="/blog/how-to-find-your-face-shape-at-home">how to find your face shape at home</a>, <a href="/blog/necklace-for-your-face-shape-and-neckline">the best necklace for your face shape</a> and <a href="/blog/claw-clip-styles-for-your-face-shape">claw clip styles for your face shape</a>.</p><h2>Frequently asked questions</h2>${FAQ.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section></main>`;
  const html = pageShell({
    head: headTags({ title: 'Find your look: face shape and jewellery suggestions | WinkCasa', description: 'Upload a selfie to find your face shape and see which earrings, necklaces and hair accessories suit you. Private: your photo never leaves your device.', canonical: SITE + '/try', image: '/pins/find-your-look.png' }),
    S, cats, main, scripts: '<script src="/try.js" defer></script>',
    jsonld: [faqLd(FAQ), breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: 'Find your look', url: SITE + '/try' }]),
      { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'WinkCasa Find your look', url: SITE + '/try', applicationCategory: 'LifestyleApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' }, description: 'Free, private face shape finder that suggests earrings, necklaces and hair accessories.', publisher: { '@id': SITE + '/#organization' } }],
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
