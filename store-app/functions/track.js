import { getSettings, activeProducts, categoriesOf } from '../src/store.js';
import { SITE, headTags, pageShell } from '../src/seo.js';

export async function onRequestGet({ env }) {
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const cats = categoriesOf(rows, S);
  const main = `<main class="wrap"><div class="cathead"><p class="label">After you order</p><h1>Track your order</h1><p>Enter your order number and the mobile number you used at checkout.</p></div>
<div class="twocol"><form class="form" id="tf" novalidate><label for="t_ref">Order number</label><input id="t_ref" name="ref" placeholder="WC-XXXXXXXX" required maxlength="20"><label for="t_ph">Mobile number</label><input id="t_ph" name="phone" type="tel" inputmode="numeric" required maxlength="15"><button class="btn full" type="submit">Track order</button><p class="msg" id="tmsg" role="status"></p></form><div id="tres"></div></div></main>`;
  const script = `<script>(function(){
var f=document.getElementById('tf'),m=document.getElementById('tmsg'),r=document.getElementById('tres');
var esc=function(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var utc=function(s){return new Date(String(s).replace(' ','T')+'Z')};
var LBL={new:'Order received',ordered:'Being prepared',shipped:'Shipped',delivered:'Delivered',cancelled:'Cancelled',returned:'Returned'};
var q=new URLSearchParams(location.search);if(q.get('ref'))f.ref.value=q.get('ref');
f.onsubmit=async function(e){e.preventDefault();m.className='msg';m.textContent='Looking up your order…';r.innerHTML='';
try{var x=await fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref:f.ref.value,phone:f.phone.value})});var o=await x.json();if(!x.ok)throw new Error(o.error||'Could not find that order.');
m.textContent='';var st=o.paid?(LBL[o.status]||o.status):'Awaiting payment';
var rows='<dt>Order number</dt><dd><b>'+esc(o.ref)+'</b></dd><dt>Status</dt><dd><b>'+esc(st)+'</b></dd><dt>Order placed</dt><dd>'+esc(WC.fmtDT(utc(o.placedAt)))+'</dd>';
if(o.deliveryMinAt&&o.status!=='delivered'&&o.status!=='cancelled')rows+='<dt>Expected delivery</dt><dd>'+esc(WC.fmtD(utc(o.deliveryMinAt)))+' to '+esc(WC.fmtD(utc(o.deliveryMaxAt)))+', by 9:00 PM</dd>';
if(o.shippedAt)rows+='<dt>Shipped</dt><dd>'+esc(WC.fmtDT(utc(o.shippedAt)))+'</dd>';
if(o.tracking)rows+='<dt>Courier tracking</dt><dd>'+esc(o.courier||'')+' '+esc(o.tracking)+'</dd>';
if(o.deliveredAt)rows+='<dt>Delivered</dt><dd>'+esc(WC.fmtDT(utc(o.deliveredAt)))+'</dd>';
rows+='<dt>Items</dt><dd>'+o.items.map(function(i){return esc(i.qty+' × '+i.name)}).join('<br>')+'</dd><dt>Deliver to</dt><dd>'+esc(o.city)+' '+esc(o.pincode)+'</dd><dt>Total</dt><dd>₹'+(o.total/100).toLocaleString('en-IN')+'</dd>';
if(o.refund&&o.refund!=='none')rows+='<dt>Refund</dt><dd>'+esc(o.refund)+'</dd>';
r.innerHTML='<div class="done" style="padding:0;text-align:left"><h2 style="font-family:var(--display);font-weight:500;font-size:1.8rem;margin:0">Hello '+esc(o.name)+'</h2><dl>'+rows+'</dl><p style="color:var(--muted)">Need help? <a href="/contact">Contact us</a> with your order number.</p></div>';
if(o.status==='delivered'&&o.paid){var rb=document.createElement('div');rb.className='revbox';rb.innerHTML='<h3 style="margin:18px 0 6px">Rate your items</h3>'+o.items.map(function(i){var done=(o.reviewed||[]).indexOf(i.id)>-1;return '<div class="revform" data-pid="'+i.id+'"><b>'+esc(i.name)+'</b>'+(done?'<p class="muted" style="margin:6px 0 0">Thank you, your review is on the product page.</p>':'<div class="pick" role="radiogroup" aria-label="Rating">'+[1,2,3,4,5].map(function(n){return '<button type="button" data-n="'+n+'" aria-label="'+n+' star">★</button>'}).join('')+'</div><textarea maxlength="1000" placeholder="Tell others what you think (optional)"></textarea><button type="button" class="btn rsend" style="margin-top:8px">Submit review</button><p class="rmsg muted" style="margin:6px 0 0"></p>')+'</div>'}).join('');r.firstChild.appendChild(rb);
rb.addEventListener('click',function(e){var t=e.target,box=t.closest('.revform');if(!box)return;
if(t.matches('.pick button')){box.dataset.rate=t.dataset.n;box.querySelectorAll('.pick button').forEach(function(b){b.classList.toggle('on',+b.dataset.n<=+t.dataset.n)})}
if(t.matches('.rsend')){var msg=box.querySelector('.rmsg');if(!box.dataset.rate){msg.textContent='Choose a star rating first.';return}
t.disabled=true;fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref:o.ref,phone:f.phone.value,product_id:+box.dataset.pid,rating:+box.dataset.rate,text:box.querySelector('textarea').value,name:o.name})}).then(function(x){return x.json().then(function(d){if(!x.ok)throw new Error(d.error||'Could not save your review.');box.innerHTML='<b>Thank you!</b> <span class="muted">Your review is now on the product page.</span>'})}).catch(function(er){msg.textContent=er.message;t.disabled=false})}})}
}
catch(x){m.className='msg err';m.textContent=x.message}};
if(q.get('ref')&&false)f.onsubmit(new Event('submit'));})();</script>`;
  const html = pageShell({
    head: headTags({ title: 'Track your order | WinkCasa', description: 'Check the status and expected delivery date of your WinkCasa order.', canonical: SITE + '/track', noindex: true }),
    S, cats, main, scripts: script,
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
