/* Products + Store settings editor. Uses helpers from index.html: $, api, esc, inr, toast */
let PRODUCTS = [], SETTINGS = null;

/* ---------------- SEO marks (Rank Math style) ---------------- */
const wc = (s) => String(s || '').split(/\s+/).filter(Boolean).length;
const badge = (n, max) => { const pc = n / max * 100; const c = pc >= 80 ? '#3FAE77' : pc >= 50 ? '#E7A93B' : '#D95C5C'; return `<span style="display:inline-block;min-width:44px;text-align:center;padding:3px 9px;border-radius:999px;font-weight:700;font-size:.8rem;background:${c}22;color:${c};border:1px solid ${c}66">${n}/${max}</span>`; };
function prodScore(p) {
  const kw = String(p.focus_keyword || '').toLowerCase().trim(), has = (x) => kw && String(x || '').toLowerCase().includes(kw), hl = p.highlights || [];
  const checks = [['Focus keyword set', !!kw], ['Keyword in title', has(p.seo_title)], ['Keyword in description', has(p.seo_description)], ['Title 30 to 65 characters', (p.seo_title || '').length >= 30 && p.seo_title.length <= 65],
    ['Description 110 to 165 characters', (p.seo_description || '').length >= 110 && p.seo_description.length <= 165], ['Quick answer 25 to 60 words', wc(p.ai_answer) >= 25 && wc(p.ai_answer) <= 60], ['Details 120+ words', wc(p.details) >= 120],
    ['3+ customer questions', (p.faq || []).filter((f) => f.q && f.a).length >= 3], ['Photo description added', !!p.img_alt], ['Material or key points added', !!p.material || hl.length >= 2]];
  return { ok: checks.filter((c) => c[1]).length, checks };
}

// Home page score out of 100, grouped like Rank Math (basic, additional, content, structured data).
function homeScore(S, prods) {
  const kw = (S.seo.keyword || '').toLowerCase().trim(), t = S.seo.title || '', d = S.seo.description || '', has = (x) => kw && String(x || '').toLowerCase().includes(kw);
  const h1 = `${S.hero.headline} ${S.hero.accent}`.toLowerCase(), first = kw.split(/\s+/)[0] || '';
  const b = S.business, socials = Object.values(S.social).filter((u) => /^https?:\/\//.test(u)).length;
  const live = prods.filter((p) => p.active), avg = live.length ? live.reduce((a, p) => a + prodScore(p).ok, 0) / live.length : 0;
  const faqN = S.faq.filter((f) => f.q && f.a).length, aboutWords = wc(S.about.text), catsOk = S.categories.length && S.categories.every((c) => (c.description || '').length >= 60);
  const G = [
    ['Basic SEO', [
      ['Focus keyphrase is set', !!kw, 10, 'Type the phrase shoppers search for, such as “jewellery online in India”.'],
      ['Keyphrase is in the page title', has(t), 10, 'Use the exact phrase in the home page title.'],
      ['Keyphrase is near the start of the title', !!kw && t.toLowerCase().indexOf(kw) >= 0 && t.toLowerCase().indexOf(kw) <= 25, 5, 'Put the phrase in the first few words of the title.'],
      ['Keyphrase is in the search description', has(d), 10, 'Mention the phrase naturally in the description.'],
      ['Keyphrase is in the opening paragraph', has(S.hero.text), 10, 'Use the phrase in the paragraph under the banner heading.'],
      ['Main heading contains the first keyword', !!first && h1.includes(first), 5, 'Add the main word (for example “jewellery”) to the banner heading.'],
      ['Title is 30 to 60 characters', t.length >= 30 && t.length <= 60, 5, `Now ${t.length}. Google cuts titles near 60.`],
      ['Description is 120 to 160 characters', d.length >= 120 && d.length <= 160, 5, `Now ${d.length}. Aim for about 155.`],
    ]],
    ['Additional', [
      ['Share image is set', !!S.seo.ogImage, 5, 'Upload an image so shared links look good.'],
      ['Brand name is in the title', /wink\s?casa/i.test(t), 2, 'End the title with “| WinkCasa”.'],
      ['2 or more social profiles linked', socials >= 2, 5, 'Add Instagram, Facebook or YouTube links under Social profiles. They go into your Google brand data.'],
      ['Address, phone and email are complete', !!(b.street && b.city && b.postcode && b.phone && b.email), 5, 'Fill every field under Business details.'],
      ['Opening hours are set', !!b.hours, 3, 'Add hours such as Mo-Sa 10:00-18:00.'],
      ['Founder name is set (trust signal)', !!S.seo.founder, 2, 'Add the founder name for brand data.'],
    ]],
    ['Content', [
      [`About text is 120+ words (now ${aboutWords})`, aboutWords >= 120, 5, 'Write who you are, where you are and what you sell.'],
      ['Keyphrase appears in the About text', has(S.about.text), 3, 'Mention the phrase once in a natural sentence.'],
      [`5+ questions in the FAQ (now ${faqN})`, faqN >= 5, 7, 'AI assistants quote FAQs. Add real customer questions.'],
      ['Every collection has a description of 60+ characters', !!catsOk, 4, 'Describe each collection in one or two sentences.'],
      [`10+ live products (now ${live.length})`, live.length >= 10, 4, 'More live products gives search engines more to index.'],
      [`Product pages average 9/10 or better (now ${avg.toFixed(1)})`, avg >= 9, 6, 'Open Products and fix the lowest SEO marks.'],
    ]],
    ['Structured data (automatic)', [
      ['Organisation, WebSite, WebPage, product list and FAQ data are added to the page', !S.seo.noindex, 5, 'Switch off “Hide from Google” to publish the data.'],
    ]],
  ];
  let got = 0, max = 0;
  G.forEach(([, items]) => items.forEach((i) => { max += i[2]; if (i[1]) got += i[2]; }));
  return { score: Math.round(got / max * 100), G };
}

/* ---------------- Products ---------------- */
window.loadProducts = async function () {
  PRODUCTS = await api('products');
  const el = $('#t-products');
  const cats = [...new Set(PRODUCTS.map((p) => p.category))];
  el.innerHTML = `<div class="filters"><input id="pq" placeholder="Search products"><select id="pc"><option value="">All categories</option>${cats.map((c) => `<option>${esc(c)}</option>`).join('')}</select><button class="btn" id="padd">+ Add product</button></div>
  <div class="card tw"><table><thead><tr><th></th><th>Product</th><th>Price</th><th>Cost</th><th>Stock</th><th>SEO</th><th>Status</th><th></th></tr></thead><tbody id="prows"></tbody></table><p id="pnone" class="muted hide">No products yet. Click “Add product”.</p></div>`;
  const draw = () => {
    const q = $('#pq').value.toLowerCase(), c = $('#pc').value;
    const list = PRODUCTS.filter((p) => (!c || p.category === c) && (!q || (p.name + p.category).toLowerCase().includes(q)));
    $('#pnone').classList.toggle('hide', list.length > 0);
    $('#prows').innerHTML = list.map((p) => `<tr class="row" data-id="${p.id}"><td>${p.images[0] ? `<img class="thumb" src="${esc(p.images[0])}" alt="">` : '<div class="thumb"></div>'}</td>
      <td><b>${esc(p.name)}</b><div class="muted">${esc(p.category)}${p.tag ? ' · ' + esc(p.tag) : ''}</div></td>
      <td>${inr(p.price * 100)}${p.mrp ? `<div class="muted" style="text-decoration:line-through">${inr(p.mrp * 100)}</div>` : ''}</td>
      <td>${p.cost ? inr(p.cost * 100) + `<div class="muted">margin ${Math.round((p.price - p.cost) / p.price * 100)}%</div>` : '<span class="muted">—</span>'}</td>
      <td>${p.stock === null ? '<span class="muted">Unlimited</span>' : p.stock <= 0 ? '<span class="pill p-cancelled">Sold out</span>' : p.stock <= 3 ? `<span class="pill p-new">${p.stock} left</span>` : p.stock}</td>
      <td title="${esc(prodScore(p).checks.filter((c) => !c[1]).map((c) => 'Missing: ' + c[0]).join('\n') || 'All SEO checks pass')}">${badge(prodScore(p).ok, 10)}</td>
      <td><span class="pill ${p.active ? 'p-paid' : 'p-cancelled'}">${p.active ? 'Live' : 'Hidden'}</span></td>
      <td><button class="btn ghost sm" data-tog="${p.id}">${p.active ? 'Hide' : 'Show'}</button></td></tr>`).join('');
    document.querySelectorAll('#prows tr').forEach((r) => (r.onclick = (e) => { if (e.target.dataset.tog) return; openProduct(+r.dataset.id); }));
    document.querySelectorAll('[data-tog]').forEach((b) => (b.onclick = async () => {
      const p = PRODUCTS.find((x) => x.id == b.dataset.tog);
      try { await saveProduct({ ...p, active: !p.active }); toast(p.active ? 'Hidden from store' : 'Now live'); loadProducts(); } catch (e) { toast(e.message); }
    }));
  };
  $('#pq').oninput = draw; $('#pc').onchange = draw; $('#padd').onclick = () => openProduct(0); draw();
};

const slug = (t) => String(t || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
const saveProduct = (p) => api('products', { method: 'POST', body: JSON.stringify(p) });

function shrink(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 1000, sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('Could not read that image.'));
    img.src = URL.createObjectURL(file);
  });
}

function openProduct(id) {
  const p = id ? { ...PRODUCTS.find((x) => x.id === id) } : { name: '', category: PRODUCTS[0]?.category || 'Skincare', price: '', mrp: null, description: '', tag: '', images: [], stock: null, active: 1, supplier: '', cost: 0, seo_title: '', seo_description: '', details: '', highlights: [], brand: '', sku: '', faq: [], focus_keyword: '', ai_answer: '', img_alt: '', material: '', noindex: 0 };
  p.images = [...(p.images || [])]; p.highlights = [...(p.highlights || [])]; p.faq = (p.faq || []).map((f) => ({ ...f }));
  const d = $('#drawer'); d.classList.remove('hide'); $('#scrim').classList.remove('hide'); $('#scrim').onclick = closeDrawer;
  const cats = [...new Set(PRODUCTS.map((x) => x.category))];
  const draw = () => {
    d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h2>${id ? 'Edit product' : 'New product'}</h2><span>${id ? `<a class="btn ghost sm" target="_blank" href="/p/${id}-${slug(p.name)}">View page</a> ` : ''}<button class="btn ghost sm" id="x">Close</button></span></div>
    <label>Product name</label><input id="p_name" value="${esc(p.name)}" maxlength="100">
    <div class="row2"><div><label>Category</label><input id="p_cat" list="cats" value="${esc(p.category)}"><datalist id="cats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div>
    <div><label>Badge (optional, e.g. New, Bestseller)</label><input id="p_tag" value="${esc(p.tag || '')}" maxlength="20"></div></div>
    <div class="row2"><div><label>Selling price (₹)</label><input id="p_price" type="number" min="1" step="1" value="${p.price}"></div>
    <div><label>MRP / crossed-out price (₹, optional)</label><input id="p_mrp" type="number" min="1" step="1" value="${p.mrp ?? ''}"></div></div>
    <label>Short description (shown under the name)</label><input id="p_desc" value="${esc(p.description)}" maxlength="200" placeholder="30 ml · brightening · dropper bottle">
    <label>Photos (first photo is the main one)</label>
    <div class="imgs">${p.images.map((u, i) => `<div><img src="${esc(u)}" alt="">${i === 0 ? '<span class="main">Main</span>' : `<span class="main" style="background:#000a;color:#fff;cursor:pointer" data-main="${i}">Make main</span>`}<button data-rm="${i}" title="Remove">×</button></div>`).join('') || '<span class="muted">No photos yet. Without a photo a simple drawing is shown.</span>'}</div>
    <div class="acts"><label class="btn ghost sm" style="margin:0;cursor:pointer;color:var(--fg)">Upload photos<input id="p_file" type="file" accept="image/*" multiple hidden></label></div>
    <div class="row2" style="margin-top:6px"><input id="p_url" placeholder="…or paste an image link (https://)"><button class="btn ghost sm" id="p_urladd">Add link</button></div>
    <p class="hint">Upload your own product photos or use ones from your supplier. Up to 6 per product.</p>
    <div class="row2"><div><label>Stock (blank = unlimited)</label><input id="p_stock" type="number" min="0" step="1" value="${p.stock ?? ''}"></div>
    <div><label>Your cost incl. supplier shipping (₹)</label><input id="p_cost" type="number" min="0" step="1" value="${p.cost || ''}"></div></div>
    <label>Supplier</label><input id="p_sup" value="${esc(p.supplier || '')}" maxlength="80">
    <div class="card" id="seoCard" style="margin-top:18px;padding:14px;border:1px solid var(--accent)">
    <h3 style="margin:0 0 4px">SEO · AEO · GEO for this product</h3><p class="hint" style="margin:0 0 10px">Everything Google, ChatGPT, Gemini, Perplexity and Claude read on this product's page. Be specific and honest.</p>
    <div class="acts" style="margin:0 0 10px"><button class="btn ghost sm" id="seoAuto" type="button">Auto-fill empty fields</button><span id="seoScore" class="muted" style="align-self:center"></span></div>
    <div id="seoPrev" class="card" style="padding:12px;margin-bottom:10px;background:#fff;color:#202124"></div>
    <label>Focus keyword (what shoppers type into Google)</label><input id="p_kw" value="${esc(p.focus_keyword || '')}" maxlength="80" placeholder="gold plated butterfly earrings">
    <label>Search title (about 60 characters) <span id="c_t" class="muted"></span></label><input id="p_seot" value="${esc(p.seo_title || '')}" maxlength="70" placeholder="Butterfly Earrings | Gold Plated, Lightweight | WinkCasa">
    <label>Search description (about 155 characters) <span id="c_d" class="muted"></span></label><textarea id="p_seod" rows="2" maxlength="170" placeholder="What it is, who it is for, price and delivery.">${esc(p.seo_description || '')}</textarea>
    <label>Quick answer for AI assistants (AEO): one or two plain sentences, 25 to 60 words <span id="c_a" class="muted"></span></label><textarea id="p_ans" rows="3" maxlength="400" placeholder="Butterfly Earrings are lightweight gold-plated earrings for everyday wear, priced at ₹499 with free delivery across India above ₹999.">${esc(p.ai_answer || '')}</textarea>
    <label>Full product details (blank line = new paragraph)</label><textarea id="p_det" rows="6" maxlength="3000" placeholder="What it is, key ingredients or materials, size, how to use or care, what is in the box.">${esc(p.details || '')}</textarea>
    <label>Key points (one per line)</label><textarea id="p_hl" rows="4" placeholder="Suitable for sensitive ears&#10;Gold-plated, anti-tarnish">${esc(p.highlights.join('\n'))}</textarea>
    <div class="row2"><div><label>Material (optional)</label><input id="p_mat" value="${esc(p.material || '')}" maxlength="80" placeholder="Stainless steel, gold plated"></div><div><label>Photo description (alt text)</label><input id="p_alt" value="${esc(p.img_alt || '')}" maxlength="140" placeholder="Gold butterfly earrings worn on an ear"></div></div>
    <div class="row2"><div><label>Brand (optional)</label><input id="p_brand" value="${esc(p.brand || '')}" maxlength="60"></div><div><label>SKU / code (optional)</label><input id="p_sku" value="${esc(p.sku || '')}" maxlength="40"></div></div>
    <label>Questions customers ask (shown on the page and read by AI assistants)</label>
    ${p.faq.map((f, i) => `<div class="card" style="margin-bottom:8px;padding:10px"><input class="fq" data-i="${i}" value="${esc(f.q)}" placeholder="Question"><textarea class="fa" data-i="${i}" rows="2" style="margin-top:6px" placeholder="Answer">${esc(f.a)}</textarea><button class="btn ghost sm" data-fdel="${i}" style="margin-top:6px">Remove</button></div>`).join('')}
    ${p.faq.length < 6 ? '<button class="btn ghost sm" id="p_fadd">+ Add question</button>' : ''}
    <div class="sw" style="margin-top:10px"><input type="checkbox" id="p_noi" ${p.noindex ? 'checked' : ''}><label for="p_noi" style="margin:0;color:var(--fg)">Hide this page from Google and AI search</label></div>
    <p class="hint">This page lives at <b>/p/${p.id || 'new'}-…</b> and is added to the sitemap automatically.</p>
    </div>
    <div class="sw"><input type="checkbox" id="p_act" ${p.active ? 'checked' : ''}><label for="p_act" style="margin:0;color:var(--fg)">Live on the store</label></div>
    <div class="savebar"><button class="btn" id="p_save">${id ? 'Save changes' : 'Create product'}</button>${id ? '<button class="btn ghost" id="p_dup">Duplicate</button><button class="btn ghost" id="p_del" style="color:var(--bad)">Delete</button>' : ''}</div>`;
    $('#x').onclick = closeDrawer;
    const keep = () => { p.name = $('#p_name').value; p.category = $('#p_cat').value; p.tag = $('#p_tag').value; p.price = $('#p_price').value; p.mrp = $('#p_mrp').value; p.description = $('#p_desc').value; p.stock = $('#p_stock').value; p.cost = $('#p_cost').value; p.supplier = $('#p_sup').value; p.active = $('#p_act').checked ? 1 : 0;
      p.brand = $('#p_brand').value; p.sku = $('#p_sku').value; p.seo_title = $('#p_seot').value; p.seo_description = $('#p_seod').value; p.focus_keyword = $('#p_kw').value; p.ai_answer = $('#p_ans').value; p.material = $('#p_mat').value; p.img_alt = $('#p_alt').value; p.noindex = $('#p_noi').checked ? 1 : 0; p.details = $('#p_det').value;
      p.highlights = $('#p_hl').value.split('\n').map((x) => x.trim()).filter(Boolean);
      d.querySelectorAll('.fq').forEach((i) => (p.faq[+i.dataset.i].q = i.value)); d.querySelectorAll('.fa').forEach((i) => (p.faq[+i.dataset.i].a = i.value)); };
    const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
    const free = SETTINGS?.shipping?.freeShippingAbove || 999;
    const cnt = () => {
      keep();
      const t = p.seo_title || `${p.name} | ${p.category} | WinkCasa`, dsc = p.seo_description || p.description || '';
      $('#c_t').textContent = $('#p_seot').value.length + ' characters'; $('#c_d').textContent = $('#p_seod').value.length + ' characters'; $('#c_a').textContent = $('#p_ans').value.trim().split(/\s+/).filter(Boolean).length + ' words';
      $('#seoPrev').innerHTML = `<div style="font-size:.75rem;color:#4d5156">winkcasa.com › p › ${esc((p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30))}</div><div style="font-size:1.1rem;color:#1a0dab;margin:2px 0">${esc(t.slice(0, 60))}</div><div style="font-size:.85rem;color:#4d5156">${esc(dsc.slice(0, 160)) || 'Add a search description.'}</div>`;
      const kw = (p.focus_keyword || '').toLowerCase().trim(), has = (x) => kw && String(x || '').toLowerCase().includes(kw), words = (p.details || '').split(/\s+/).filter(Boolean).length, aw = (p.ai_answer || '').split(/\s+/).filter(Boolean).length;
      const faqN = p.faq.filter((f) => f.q && f.a).length;
      const checks = [['Focus keyword set', !!kw], ['Keyword in title', has(p.seo_title)], ['Keyword in description', has(p.seo_description)], ['Title 30 to 65 characters', (p.seo_title || '').length >= 30 && p.seo_title.length <= 65],
        ['Description 110 to 165 characters', (p.seo_description || '').length >= 110 && p.seo_description.length <= 165], ['Quick answer 25 to 60 words', aw >= 25 && aw <= 60], ['Details 120+ words', words >= 120], ['3+ customer questions', faqN >= 3], ['Photo description added', !!p.img_alt], ['Material or key points added', !!p.material || p.highlights.length >= 2]];
      const ok = checks.filter((c) => c[1]).length; $('#seoScore').innerHTML = `<b style="color:${ok >= 8 ? 'var(--ok,#6bbf8a)' : ok >= 5 ? '#E7C77C' : 'var(--bad)'}">${ok}/10</b> ` + checks.filter((c) => !c[1]).map((c) => '✗ ' + c[0]).join(' · ');
    };
    $('#seoCard').addEventListener('input', cnt); cnt();
    $('#seoAuto').onclick = () => {
      keep(); const n = p.name || 'This product', cat = (p.category || 'jewellery').toLowerCase(), kw = p.focus_keyword || (n.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).slice(0, 4).join(' '));
      if (!p.focus_keyword) p.focus_keyword = kw;
      if (!p.seo_title) { const t = `${n.split(/[,(]/)[0].trim().slice(0, 40)} | ${p.category} in India | WinkCasa`; p.seo_title = t.length <= 65 ? t : `${n.slice(0, 45)} | WinkCasa`; }
      if (!p.seo_description) p.seo_description = `Buy ${n.split(/[,(]/)[0].trim()} online at WinkCasa for ${money(p.price)}. ${p.description ? p.description.slice(0, 60) + '. ' : ''}Free delivery above ${money(free)} across India and 7-day returns on damaged or wrong items.`.slice(0, 165);
      if (!p.ai_answer) p.ai_answer = `${n.split(/[,(]/)[0].trim()} is a ${cat} piece from WinkCasa, priced at ${money(p.price)}${p.material ? ', made of ' + p.material.toLowerCase() : ''}. ${p.highlights.length ? p.highlights.slice(0, 2).join('. ') + '. ' : ''}Delivery across India is free above ${money(free)}, with 7-day returns on damaged, defective or wrong items.`.slice(0, 400);
      if (!p.img_alt) p.img_alt = n.split(/[,(]/)[0].trim().slice(0, 120);
      if (p.faq.filter((f) => f.q && f.a).length < 3) { const base = n.split(/[,(]/)[0].trim(), add = [[`How much does ${base} cost?`, `${base} is priced at ${money(p.price)} including GST. Delivery is free above ${money(free)} across India.`], [`Can I return ${base} if it arrives damaged?`, 'Yes. If it arrives damaged, defective or not as described, tell us within 7 days and we will replace it or refund you.'], [`Do you deliver ${base} across India?`, 'Yes, WinkCasa delivers to serviceable pincodes across India. Your estimated delivery dates are shown at checkout.']]; p.faq = p.faq.filter((f) => f.q && f.a); add.forEach((f) => { if (p.faq.length < 6) p.faq.push({ q: f[0], a: f[1] }); }); }
      draw(); toast('Filled the empty fields. Please review and edit.');
    };
    d.querySelectorAll('[data-fdel]').forEach((b) => (b.onclick = () => { keep(); p.faq.splice(+b.dataset.fdel, 1); draw(); }));
    if ($('#p_fadd')) $('#p_fadd').onclick = () => { keep(); p.faq.push({ q: '', a: '' }); draw(); };
    d.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { keep(); p.images.splice(+b.dataset.rm, 1); draw(); }));
    d.querySelectorAll('[data-main]').forEach((b) => (b.onclick = () => { keep(); const [u] = p.images.splice(+b.dataset.main, 1); p.images.unshift(u); draw(); }));
    $('#p_urladd').onclick = () => { const u = $('#p_url').value.trim(); if (!/^https:\/\//.test(u)) return toast('Link must start with https://'); keep(); p.images.push(u); draw(); };
    $('#p_file').onchange = async (e) => {
      keep(); toast('Uploading…');
      try {
        for (const f of [...e.target.files].slice(0, 6 - p.images.length)) {
          const r = await api('upload', { method: 'POST', body: JSON.stringify({ data: await shrink(f) }) });
          p.images.push(r.url);
        }
        draw(); toast('Photos added');
      } catch (err) { toast(err.message); draw(); }
    };
    $('#p_save').onclick = async () => {
      keep();
      try { const r = await saveProduct({ ...p, id: id || undefined }); toast('Saved'); await loadProducts(); if (!id) openProduct(r.id); else closeDrawer(); } catch (err) { toast(err.message); }
    };
    if (id) {
      $('#p_dup').onclick = async () => { keep(); try { await saveProduct({ ...p, id: undefined, name: p.name + ' (copy)', active: 0, sort: 0 }); toast('Duplicated (hidden)'); closeDrawer(); loadProducts(); } catch (err) { toast(err.message); } };
      $('#p_del').onclick = async () => {
        if (!confirm('Delete “' + p.name + '” permanently? Past orders keep their details. To just take it off the store, use Hide instead.')) return;
        try { await api('products?id=' + id, { method: 'DELETE' }); toast('Deleted'); closeDrawer(); loadProducts(); } catch (err) { toast(err.message); }
      };
    }
  };
  draw();
}

/* ---------------- Store settings ---------------- */
const getp = (o, path) => path.split('.').reduce((a, k) => a?.[k], o);
const setp = (o, path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };

window.loadStore = async function () {
  SETTINGS = await api('settings');
  try { PRODUCTS = await api('products'); } catch { /* score just ignores product pages */ }
  drawStore();
};

function drawStore() {
  const S = SETTINGS, el = $('#t-store');
  const txt = (label, path, ph = '', area = false) => `<label>${label}</label>${area ? `<textarea rows="2" data-p="${path}" placeholder="${esc(ph)}">${esc(getp(S, path))}</textarea>` : `<input data-p="${path}" value="${esc(getp(S, path))}" placeholder="${esc(ph)}">`}`;
  const num = (label, path) => `<label>${label}</label><input type="number" min="0" step="1" data-n="${path}" value="${getp(S, path)}">`;
  const chk = (label, path) => `<div class="sw"><input type="checkbox" id="c_${path}" data-b="${path}" ${getp(S, path) ? 'checked' : ''}><label for="c_${path}" style="margin:0;color:var(--fg)">${label}</label></div>`;
  const links = (path, title) => `<label>${title}</label>${getp(S, path).map((l, i) => `<div class="lrow"><input data-p="${path}.${i}.label" value="${esc(l.label)}" placeholder="Label"><input data-p="${path}.${i}.href" value="${esc(l.href)}" placeholder="/page or #section or https://"><button class="btn ghost sm" data-del="${path}.${i}">×</button></div>`).join('')}<button class="btn ghost sm" data-add="${path}" data-tpl='{"label":"","href":""}'>+ Add link</button>`;
  el.innerHTML = `<div class="grid three">
  <div class="card sect"><h3>Store status</h3><p class="hint">Close the store while you restock or are away. Browsing still works; checkout is blocked.</p>
    ${chk('Store is open for orders', 'store.open')}${txt('Message shown when closed', 'store.closedMessage', '', true)}
    <h3 style="margin-top:16px">Delivery charges</h3>${num('Free delivery above (₹)', 'shipping.freeShippingAbove')}${num('Delivery charge below that (₹)', 'shipping.charge')}</div>
  <div class="card sect"><h3>Top announcement bar</h3><p class="hint">A strip above the header, for offers or notices.</p>
    ${chk('Show announcement bar', 'announcement.enabled')}${txt('Text', 'announcement.text', 'Free delivery above ₹999')}${txt('Link (optional)', 'announcement.link', '#shop')}
    </div>
  <div class="card sect"><h3>Homepage banner</h3>
    ${txt('Small line above heading', 'hero.eyebrow')}${txt('Heading', 'hero.headline')}${txt('Highlighted heading words', 'hero.accent')}${txt('Paragraph', 'hero.text', '', true)}
    ${txt('Button text', 'hero.ctaLabel')}${txt('Button link', 'hero.ctaLink', '#shop')}
    <label>Highlights under the button</label><p class="hint">Wrap words in **double stars** to make them bold.</p>
    ${S.hero.facts.map((f, i) => `<div class="lrow"><input data-p="hero.facts.${i}" value="${esc(f)}"><button class="btn ghost sm" data-del="hero.facts.${i}">×</button></div>`).join('')}<button class="btn ghost sm" data-addfact="1">+ Add highlight</button></div>
  <div class="card sect"><h3>Product section heading</h3>${txt('Small label', 'collection.label')}${txt('Heading', 'collection.title')}
    <h3 style="margin-top:16px">Three promises band</h3>${S.promise.map((x, i) => `<label>Box ${i + 1}</label><input data-p="promise.${i}.title" value="${esc(x.title)}"><textarea rows="2" data-p="promise.${i}.text" style="margin-top:6px">${esc(x.text)}</textarea>`).join('')}</div>
  <div class="card sect"><h3>Footer</h3>${txt('Copyright line', 'footer.copyright')}${txt('Note on the right', 'footer.note')}${chk('Credit Unsplash for photos (turn off once all photos are yours)', 'footer.showUnsplash')}${links('footer.links', 'Footer links')}</div>
  <div class="card sect"><h3>Search &amp; AI visibility</h3><p class="hint">Controls how WinkCasa appears on Google and in AI answers (ChatGPT, Perplexity, Gemini, Claude).</p>
    <div id="homeSeo" class="card" style="padding:12px;margin-bottom:10px;border:1px solid var(--accent)"></div>
    ${txt('Focus keyphrase (what shoppers type into Google)', 'seo.keyword', 'jewellery online in India')}
    ${txt('Home page title (30 to 60 characters)', 'seo.title')}<div class="hint" id="cnt_t"></div>${txt('Home page description (120 to 160 characters)', 'seo.description', '', true)}<div class="hint" id="cnt_d"></div>
    ${txt('Share title for Facebook, WhatsApp, X (blank = same as title)', 'seo.ogTitle')}${txt('Share description (blank = same as description)', 'seo.ogDescription', '', true)}
    ${txt('Founder name (shown to search engines as brand data)', 'seo.founder')}
    ${chk('Hide the home page from Google and AI search', 'seo.noindex')}
    <label>Share image (shown when your link is shared)</label><div class="lrow"><input data-p="seo.ogImage" value="${esc(S.seo.ogImage)}" placeholder="Upload or paste a link"><label class="btn ghost sm" style="margin:0;cursor:pointer;color:var(--fg)">Upload<input id="og_file" type="file" accept="image/*" hidden></label></div>
    <p class="hint">Leave blank to use your first product photo.</p></div>
  <div class="card sect"><h3>Business details (shown in footer &amp; to search engines)</h3><p class="hint">Keep these identical to your Google Business Profile, GST record and Contact page.</p>
    ${txt('Trading name', 'business.name')}${txt('Legal name', 'business.legalName')}${txt('GSTIN', 'business.gstin')}${txt('Street address', 'business.street')}
    <div class="row2"><div>${txt('City', 'business.city')}</div><div>${txt('State', 'business.state')}</div></div>${txt('Pincode', 'business.postcode')}${txt('Phone', 'business.phone')}${txt('Email', 'business.email')}${txt('Opening hours (optional, e.g. Mo-Sa 10:00-18:00)', 'business.hours')}</div>
  <div class="card sect"><h3>Social profiles</h3><p class="hint">Full links. They appear in the footer and help Google and AI link your brand to your accounts.</p>
    ${txt('Instagram', 'social.instagram', 'https://instagram.com/…')}${txt('Facebook', 'social.facebook', 'https://facebook.com/…')}${txt('YouTube', 'social.youtube', 'https://youtube.com/…')}${txt('WhatsApp link', 'social.whatsapp', 'https://wa.me/919798776985')}</div>
  <div class="card sect"><h3>Logo</h3><p class="hint">Pick a style for the header and footer, or upload your own logo image (PNG with a transparent background works best, about 300 px wide). An uploaded image replaces the style.</p>
    <label>Style</label><select data-p="logo.style"><option value="classic" ${S.logo.style === 'classic' ? 'selected' : ''}>1. Classic gold serif (with winking i)</option><option value="lash" ${S.logo.style === 'lash' ? 'selected' : ''}>2. Eyelash icon + WINKCASA</option><option value="stacked" ${S.logo.style === 'stacked' ? 'selected' : ''}>3. Stacked italic Wink / Casa</option></select>
    <label>Custom logo image (optional)</label><div class="lrow"><input data-p="logo.image" value="${esc(S.logo.image)}" placeholder="Upload or paste a link"><label class="btn ghost sm" style="margin:0;cursor:pointer;color:var(--fg)">Upload<input id="logo_file" type="file" accept="image/*" hidden></label></div>${S.logo.image ? `<img src="${esc(S.logo.image)}" alt="" style="max-height:60px;margin-top:8px;background:#0B1916;padding:8px;border-radius:8px">` : ''}</div>
  <div class="card sect"><h3>Contact page</h3><p class="hint">Text on the Contact us page. Your address, phone, email and hours come from Business details above. Customer messages arrive in the Messages tab.</p>
    ${txt('Small label', 'contact.label')}${txt('Heading', 'contact.title')}${txt('Intro text', 'contact.intro', '', true)}${txt('Extra note (e.g. reply time)', 'contact.extra', '', true)}${txt('Message shown after sending', 'contact.successMessage')}${txt('Search title', 'contact.seoTitle')}${txt('Search description (blank = automatic)', 'contact.seoDescription', '', true)}</div>
  <div class="card sect"><h3>About section (home page)</h3><p class="hint">Plain facts about who you are, where you are, what you sell and how you deliver. AI assistants quote this.</p>${txt('Heading', 'about.title')}${txt('Text (blank line = new paragraph)', 'about.text', '', true)}</div>
  <div class="card sect"><h3>Frequently asked questions (home page)</h3><p class="hint">Real questions customers ask, with short, direct answers. Shown on the home page and given to search engines.</p>
    ${S.faq.map((f, i) => `<div style="margin-bottom:10px"><input data-p="faq.${i}.q" value="${esc(f.q)}" placeholder="Question"><textarea rows="2" data-p="faq.${i}.a" style="margin-top:6px" placeholder="Answer">${esc(f.a)}</textarea><button class="btn ghost sm" data-del="faq.${i}" style="margin-top:4px">Remove</button></div>`).join('')}<button class="btn ghost sm" data-add="faq" data-tpl='{"q":"","a":""}'>+ Add question</button></div>
  <div class="card sect"><h3>Collection pages</h3><p class="hint">Each category gets its own page (like /c/skincare). The name must match the category used on your products.</p>
    ${S.categories.map((c, i) => `<div style="margin-bottom:10px"><input data-p="categories.${i}.name" value="${esc(c.name)}" placeholder="Category name"><textarea rows="2" data-p="categories.${i}.description" style="margin-top:6px" placeholder="One or two sentences about this collection">${esc(c.description)}</textarea><button class="btn ghost sm" data-del="categories.${i}" style="margin-top:4px">Remove</button></div>`).join('')}<button class="btn ghost sm" data-add="categories" data-tpl='{"name":"","description":""}'>+ Add collection</button></div>
  </div>
  <p class="muted">The WinkCasa logo, the policy pages (Returns, Shipping, Privacy, Terms, Contact) and your business details are edited by me in code, so ask whenever you need them changed.</p>
  <div class="savebar"><button class="btn" id="s_save">Save and publish</button><a class="btn ghost" href="/" target="_blank">View store</a><span class="muted">Changes appear on the store immediately.</span></div>`;
  const paintHome = () => {
    const r = homeScore(S, PRODUCTS || []), c = r.score >= 81 ? '#3FAE77' : r.score >= 51 ? '#E7A93B' : '#D95C5C';
    const t = S.seo.title || '', d = S.seo.description || '';
    if ($('#cnt_t')) { $('#cnt_t').textContent = t.length + ' characters'; $('#cnt_d').textContent = d.length + ' characters'; }
    $('#homeSeo').innerHTML = `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div style="width:74px;height:74px;border-radius:50%;border:5px solid ${c};display:flex;align-items:center;justify-content:center;flex-direction:column;line-height:1"><b style="font-size:1.4rem;color:${c}">${r.score}</b><small class="muted">/100</small></div>
      <div style="flex:1;min-width:200px"><b>Home page SEO score</b><div class="muted">Green is 81 and above, orange 51 to 80, red 50 or below.</div></div></div>
      <div style="background:#fff;color:#202124;border-radius:10px;padding:12px;margin:12px 0"><div style="font-size:.75rem;color:#4d5156">winkcasa.com</div><div style="font-size:1.1rem;color:#1a0dab;margin:2px 0">${esc(t.slice(0, 60))}</div><div style="font-size:.85rem;color:#4d5156">${esc(d.slice(0, 160))}</div></div>
      ${r.G.map(([name, items]) => `<details ${items.some((i) => !i[1]) ? 'open' : ''} style="margin-top:6px"><summary style="cursor:pointer;font-weight:600">${name} <span class="muted">${items.filter((i) => i[1]).length}/${items.length}</span></summary>${items.map((i) => `<div style="padding:4px 0 4px 6px;font-size:.88rem"><span style="color:${i[1] ? '#3FAE77' : '#D95C5C'}">${i[1] ? '✓' : '✗'}</span> ${esc(i[0])}${i[1] ? '' : `<div class="muted" style="margin-left:18px">${esc(i[3])}</div>`}</div>`).join('')}</details>`).join('')}`;
  };
  paintHome(); el.oninput = paintHome; el.onchange = paintHome;
  el.querySelectorAll('[data-p]').forEach((i) => (i.oninput = () => setp(S, i.dataset.p, i.value)));
  el.querySelectorAll('[data-n]').forEach((i) => (i.oninput = () => setp(S, i.dataset.n, Number(i.value || 0))));
  el.querySelectorAll('[data-b]').forEach((i) => (i.onchange = () => setp(S, i.dataset.b, i.checked)));
  el.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { const ks = b.dataset.del.split('.'); const idx = +ks.pop(); getp(S, ks.join('.')).splice(idx, 1); drawStore(); }));
  el.querySelectorAll('[data-add]').forEach((b) => (b.onclick = () => { const a = getp(S, b.dataset.add); if (a.length >= 12) return toast('Maximum 12 links'); a.push(JSON.parse(b.dataset.tpl)); drawStore(); }));
  el.querySelectorAll('[data-addfact]').forEach((b) => (b.onclick = () => { if (S.hero.facts.length >= 6) return toast('Maximum 6'); S.hero.facts.push(''); drawStore(); }));
  if ($('#logo_file')) $('#logo_file').onchange = async (e) => { try { const r = await api('upload', { method: 'POST', body: JSON.stringify({ data: await shrink(e.target.files[0]) }) }); S.logo.image = r.url; drawStore(); toast('Logo added. Save and publish to show it.'); } catch (err) { toast(err.message); } };
  if ($('#og_file')) $('#og_file').onchange = async (e) => { try { const r = await api('upload', { method: 'POST', body: JSON.stringify({ data: await shrink(e.target.files[0]) }) }); S.seo.ogImage = r.url; drawStore(); toast('Image added'); } catch (err) { toast(err.message); } };
  $('#s_save').onclick = async () => {
    try { const r = await api('settings', { method: 'POST', body: JSON.stringify(SETTINGS) }); SETTINGS = r.settings; toast('Published to your store'); drawStore(); } catch (e) { toast(e.message); }
  };
}

/* ---------------- Messages ---------------- */
window.loadMessages = async function () {
  const list = await api('messages'); const el = $('#t-messages');
  let only = true;
  const draw = () => {
    const shown = list.filter((m) => !only || m.status === 'new');
    el.innerHTML = `<div class="filters"><label class="sw" style="margin:0"><input type="checkbox" id="m_new" ${only ? 'checked' : ''}> Show only new messages</label><span class="muted" style="flex:1;align-self:center">Messages from your Contact page. Reply by email or WhatsApp.</span></div>
    ${shown.map((m) => `<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${esc(m.name)}</b><span class="muted">${fdt(m.created_at)} <span class="pill ${m.status === 'new' ? 'p-new' : 'p-paid'}">${m.status}</span></span></div>
    <div class="muted">${esc(m.email)}${m.phone ? ' · ' + esc(m.phone) : ''}${m.order_ref ? ' · Order ' + esc(m.order_ref) : ''}</div><p style="white-space:pre-wrap;margin:8px 0">${esc(m.message)}</p>
    <div class="acts"><a class="btn ghost sm" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: your message to WinkCasa')}">Reply by email</a>${m.phone ? `<a class="btn ghost sm" target="_blank" href="https://wa.me/91${esc(m.phone.replace(/\D/g, '').slice(-10))}">WhatsApp</a>` : ''}<button class="btn ghost sm" data-st="${m.id}:${m.status === 'new' ? 'done' : 'new'}">${m.status === 'new' ? 'Mark as done' : 'Reopen'}</button></div></div>`).join('') || '<p class="muted">No messages.</p>'}`;
    $('#m_new').onchange = (e) => { only = e.target.checked; draw(); };
    el.querySelectorAll('[data-st]').forEach((b) => (b.onclick = async () => { const [id, status] = b.dataset.st.split(':'); await api('messages', { method: 'POST', body: JSON.stringify({ id: +id, status }) }); const m = list.find((x) => x.id == id); m.status = status; draw(); loadStats(); }));
  };
  draw();
};

/* ---------------- Sourcing (CJ Dropshipping) ---------------- */
window.loadSourcing = async function () {
  const el = $('#t-sourcing');
  let st; try { st = await api('cj?action=status'); } catch (e) { el.innerHTML = `<div class="card">${esc(e.message)}</div>`; return; }
  const C = st.config;
  const marginRows = Object.entries(C.margins);
  el.innerHTML = `${st.connected ? '' : '<div class="card" style="border-color:var(--bad)"><b>CJ is not connected.</b> Add the CJ_API_KEY secret in Cloudflare and redeploy.</div>'}
  <div class="card sect"><h3>Pricing rules</h3><p class="hint">Selling price = (CJ price × exchange rate × buffer + CJ shipping + packing) ÷ (1 − payment fee − margin), rounded up to end in 9. Click “Reprice all CJ products” after changing anything.</p>
    <div class="row2"><div><label>USD → INR rate</label><input id="c_fx" type="number" step="0.1" value="${C.fx}"></div><div><label>Rate safety buffer %</label><input id="c_buf" type="number" step="0.5" value="${C.fxBufferPct}"></div></div>
    <div class="row2"><div><label>Fallback CJ shipping per item (₹)</label><input id="c_ship" type="number" value="${C.shipInr}"></div><div><label>Packing / misc per item (₹)</label><input id="c_pack" type="number" value="${C.packingInr}"></div></div>
    <div class="row2"><div><label>Payment fee % (Razorpay incl. GST)</label><input id="c_fee" type="number" step="0.01" value="${C.payFeePct}"></div><div><label>MRP shown above price %</label><input id="c_mrp" type="number" value="${C.mrpUpliftPct}"></div></div>
    <label>Margin % by category</label>
    ${marginRows.map(([k, v]) => `<div class="row2"><input class="mk" value="${esc(k)}"><input class="mv" type="number" value="${v}"></div>`).join('')}
    <div class="row2"><input class="mk" placeholder="New category"><input class="mv" type="number" placeholder="Margin %"></div>
    <div class="row2"><div><label>Margin % for any other category</label><input id="c_def" type="number" value="${C.defaultMarginPct}"></div><div></div></div>
    <div class="savebar"><button class="btn" id="c_save">Save rules</button><button class="btn ghost" id="c_reprice">Reprice all CJ products</button></div></div>
  <div class="card sect"><h3>Quick start: add low-cost products live</h3><p class="hint">Imports cheap beauty tools and jewellery (CJ price up to $6 / $5) straight to your store, priced with the margins above. Skincare is not included because it needs licences first. You can edit or hide any product afterwards.</p>
    <div class="savebar"><button class="btn" id="q_go">Add low-cost CJ products now</button><button class="btn ghost" id="q_hide">Hide my old sample products</button></div><pre id="q_log" class="muted" style="white-space:pre-wrap;font-size:12px;margin-top:8px"></pre></div>
  <div class="card sect"><h3>Find products on CJ</h3><p class="hint">Search CJ's catalogue, then import. Imported products stay hidden until you review and press Show in Products. Cosmetics and skincare sold in India need the right licences, so check that before making them live.</p>
    <div class="filters"><input id="s_q" placeholder="e.g. gua sha, vitamin C serum, earrings"><select id="s_cat"><option>Skincare</option><option>Beauty tools</option><option>Jewellery</option></select><button class="btn" id="s_go">Search CJ</button></div>
    <div id="s_out" class="muted">Search to see products with CJ's price.</div></div>`;
  const save = async () => {
    const margins = {}; el.querySelectorAll('.mk').forEach((k, i) => { const v = el.querySelectorAll('.mv')[i].value; if (k.value.trim() && v) margins[k.value.trim()] = Number(v); });
    const config = { fx: +$('#c_fx').value, fxBufferPct: +$('#c_buf').value, shipInr: +$('#c_ship').value, packingInr: +$('#c_pack').value, payFeePct: +$('#c_fee').value, mrpUpliftPct: +$('#c_mrp').value, defaultMarginPct: +$('#c_def').value, margins };
    await api('cj', { method: 'POST', body: JSON.stringify({ action: 'config', config }) });
  };
  $('#c_save').onclick = async () => { try { await save(); toast('Pricing rules saved'); loadSourcing(); } catch (e) { toast(e.message); } };
  $('#c_reprice').onclick = async () => { try { await save(); const r = await api('cj', { method: 'POST', body: JSON.stringify({ action: 'reprice' }) }); toast(r.updated + ' products repriced'); } catch (e) { toast(e.message); } };
  const search = async () => {
    const out = $('#s_out'); out.textContent = 'Searching…';
    try {
      const r = await api('cj?action=search&q=' + encodeURIComponent($('#s_q').value));
      out.innerHTML = r.list.length ? `<div class="grid three">${r.list.map((p) => `<div class="card"><img src="${esc(p.image)}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px"><div style="margin:6px 0"><b>${esc(p.name)}</b></div><div class="muted">CJ price $${p.usd.toFixed(2)} · stock ${p.stock ?? '—'}</div><button class="btn sm" data-imp="${esc(p.pid)}" style="margin-top:6px">Import (hidden)</button></div>`).join('')}</div>` : 'Nothing found.';
      out.querySelectorAll('[data-imp]').forEach((b) => (b.onclick = async () => {
        b.disabled = true; b.textContent = 'Importing…';
        try { const r = await api('cj', { method: 'POST', body: JSON.stringify({ action: 'import', pid: b.dataset.imp, category: $('#s_cat').value }) }); b.textContent = `Imported at ₹${r.price}`; toast(`Imported: price ₹${r.price} (cost ₹${r.costInr}). Review it in Products.`); }
        catch (e) { b.disabled = false; b.textContent = 'Import (hidden)'; toast(e.message); }
      }));
    } catch (e) { out.textContent = e.message; }
  };
  $('#q_go').onclick = async () => { const L = $('#q_log'); $('#q_go').disabled = true; L.textContent = ''; try { await save(); await autoImportCJ((t) => { L.textContent += t + '\n'; }); } catch (e) { L.textContent += e.message; } $('#q_go').disabled = false; };
  $('#q_hide').onclick = async () => { if (!confirm('Hide all products that are not from CJ (your sample products)?')) return; try { const r = await api('cj', { method: 'POST', body: JSON.stringify({ action: 'hide_placeholders' }) }); toast(r.hidden + ' sample products hidden'); } catch (e) { toast(e.message); } };
  $('#s_go').onclick = search; $('#s_q').onkeydown = (e) => { if (e.key === 'Enter') search(); };
};

/* Auto-import low-cost picks, live, using the saved margin rules. */
window.autoImportCJ = async function (log) {
  const PLAN = [
    { category: 'Beauty tools', maxUsd: 6, per: 4, q: ['gua sha', 'jade face roller', 'facial massager', 'eyebrow razor set'] },
    { category: 'Jewellery', maxUsd: 5, per: 4, q: ['stainless steel earrings', 'pendant necklace women', 'gold plated bracelet', 'minimalist ring set'] },
  ];
  let added = 0, seen = new Set();
  for (const g of PLAN) {
    for (const q of g.q) {
      log(`Searching "${q}"…`);
      let r; try { r = await api('cj?action=search&q=' + encodeURIComponent(q)); } catch (e) { log('Search failed: ' + e.message); continue; }
      const picks = r.list.filter((p) => p.usd > 0 && p.usd <= g.maxUsd && p.image && !seen.has(p.pid)).slice(0, Math.ceil(g.per / 2));
      for (const p of picks) {
        seen.add(p.pid);
        try { const x = await api('cj', { method: 'POST', body: JSON.stringify({ action: 'import', pid: p.pid, category: g.category, live: true }) }); added++; log(`✓ ${p.name.slice(0, 50)} → ₹${x.price} (CJ $${x.usd.toFixed(2)}, cost ₹${x.costInr})`); }
        catch (e) { log('Skipped: ' + e.message); }
      }
    }
  }
  log(`Done. ${added} products are live.`);
  return added;
};

// Selfies customers chose to save on /try (opt-in, auto-deleted after 90 days).
window.loadSelfies = async function () {
  const el = document.getElementById('t-selfies');
  el.innerHTML = '<div class="card"><h3>Saved selfies</h3><p class="hint">Only photos shoppers agreed to save are here. They are deleted automatically after 90 days. Treat them as sensitive personal data: never share or download them elsewhere, and delete when asked.</p><div id="sf_list">Loading…</div></div>';
  try {
    const d = await api('selfies');
    const L = document.getElementById('sf_list');
    if (!d.list.length) { L.innerHTML = '<p class="hint">No saved selfies yet.</p>'; return; }
    L.innerHTML = '<p class="hint">' + d.total + ' saved. <button class="btn ghost sm" id="sf_all">Delete all</button></p><div id="sf_grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px"></div>';
    const g = document.getElementById('sf_grid');
    d.list.forEach((s) => {
      const c = document.createElement('div'); c.style.cssText = 'border:1px solid var(--line,#2a423c);padding:8px;font-size:.78rem';
      c.innerHTML = '<div style="aspect-ratio:4/5;background:#0b1916;display:grid;place-items:center;overflow:hidden"><button class="btn ghost sm">View</button></div><div style="margin-top:6px"><b>' + (s.face_shape || '?') + '</b> · ' + (s.created_at || '').slice(0, 16) + '</div><div>' + (s.email ? (s.name || '') + '<br>' + s.email : 'Guest') + '</div><button class="btn ghost sm" style="margin-top:6px">Delete</button>';
      const [view, del] = c.querySelectorAll('button');
      view.onclick = async () => { try { const r = await api('selfies?id=' + s.id); const im = new Image(); im.src = r.image; im.style.cssText = 'width:100%;height:100%;object-fit:cover'; view.parentNode.innerHTML = ''; c.firstChild.appendChild(im); } catch (e) { toast(e.message); } };
      del.onclick = async () => { if (!confirm('Delete this selfie?')) return; await api('selfies', { method: 'POST', body: JSON.stringify({ action: 'delete', id: s.id }) }); loadSelfies(); };
      g.appendChild(c);
    });
    document.getElementById('sf_all').onclick = async () => { if (!confirm('Delete ALL saved selfies?')) return; await api('selfies', { method: 'POST', body: JSON.stringify({ action: 'delete_all' }) }); loadSelfies(); };
  } catch (e) { document.getElementById('sf_list').textContent = e.message; }
};
