import { getSettings, activeProducts, categoriesOf } from '../src/store.js';
import { SITE, esc, headTags, pageShell, breadcrumbLd, organizationLd } from '../src/seo.js';

export async function onRequestGet({ env }) {
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const cats = categoriesOf(rows, S), b = S.business, C = S.contact;
  const main = `<main class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>Contact us</span></nav>
<div class="cathead"><p class="label">${esc(C.label)}</p><h1>${esc(C.title)}</h1><p>${esc(C.intro)}</p>${C.extra ? `<p class="muted">${esc(C.extra)}</p>` : ''}</div>
<div class="twocol"><div class="legal" style="padding:0;margin:0"><h2 style="margin-top:0">Our details</h2>
<div class="bizbox" style="margin-top:0"><dl><dt>Seller</dt><dd>${esc(b.legalName)}</dd><dt>Address</dt><dd>${esc(b.street)}, ${esc(b.city)}, ${esc(b.state)} ${esc(b.postcode)}, India</dd><dt>Email</dt><dd><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></dd><dt>Phone</dt><dd><a href="tel:${esc(b.phone.replace(/\s/g, ''))}">${esc(b.phone)}</a></dd>${b.hours ? `<dt>Hours</dt><dd>${esc(b.hours)}</dd>` : ''}${b.gstin ? `<dt>GSTIN</dt><dd>${esc(b.gstin)}</dd>` : ''}${b.grievanceOfficer ? `<dt>Grievance officer</dt><dd>${esc(b.grievanceOfficer)}</dd>` : ''}</dl></div>
<p style="margin-top:18px">Already ordered? <a href="/track">Track your order</a>. See our <a href="/shipping">shipping</a> and <a href="/returns">returns</a> policies.</p></div>
<form class="form" id="cf" novalidate><div class="two"><div><label for="c_name">Your name</label><input id="c_name" name="name" autocomplete="name" required maxlength="80"></div><div><label for="c_email">Email</label><input id="c_email" name="email" type="email" autocomplete="email" required maxlength="120"></div></div>
<div class="two"><div><label for="c_phone">Mobile (optional)</label><input id="c_phone" name="phone" type="tel" autocomplete="tel" maxlength="15"></div><div><label for="c_ref">Order number (optional)</label><input id="c_ref" name="order_ref" maxlength="20" placeholder="WC-XXXXXXXX"></div></div>
<label for="c_msg">How can we help?</label><textarea id="c_msg" name="message" rows="6" required maxlength="2000"></textarea>
<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn full" type="submit">Send message</button><p class="msg" id="cmsg" role="status"></p></form></div></main>`;
  const script = `<script>(function(){var f=document.getElementById('cf'),m=document.getElementById('cmsg');f.onsubmit=async function(e){e.preventDefault();m.className='msg';m.textContent='Sending…';
var d={};[].forEach.call(f.elements,function(x){if(x.name)d[x.name]=x.value});
try{var r=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});var j=await r.json().catch(function(){return{}});
if(!r.ok)throw new Error(j.error||'Could not send. Please try again.');f.reset();m.className='msg ok';m.textContent=${JSON.stringify(C.successMessage).replace(/</g, '\\u003c')}}catch(x){m.className='msg err';m.textContent=x.message}}})();</script>`;
  const html = pageShell({
    head: headTags({ title: C.seoTitle || 'Contact WinkCasa | Customer support', description: C.seoDescription || `Contact WinkCasa in ${b.city}, India. Email ${b.email} or call ${b.phone}, or send us a message about your order.`, canonical: SITE + '/contact', image: S.seo.ogImage }),
    S, cats, main, scripts: script,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'ContactPage', url: SITE + '/contact', name: 'Contact WinkCasa', about: { '@id': SITE + '/#organization' } },
      organizationLd(S), breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: 'Contact us', url: SITE + '/contact' }])],
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}
