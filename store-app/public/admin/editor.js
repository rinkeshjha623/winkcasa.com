/* Products + Store settings editor. Uses helpers from index.html: $, api, esc, inr, toast */
let PRODUCTS = [], SETTINGS = null;

/* ---------------- Products ---------------- */
window.loadProducts = async function () {
  PRODUCTS = await api('products');
  const el = $('#t-products');
  const cats = [...new Set(PRODUCTS.map((p) => p.category))];
  el.innerHTML = `<div class="filters"><input id="pq" placeholder="Search products"><select id="pc"><option value="">All categories</option>${cats.map((c) => `<option>${esc(c)}</option>`).join('')}</select><button class="btn" id="padd">+ Add product</button></div>
  <div class="card tw"><table><thead><tr><th></th><th>Product</th><th>Price</th><th>Cost</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody id="prows"></tbody></table><p id="pnone" class="muted hide">No products yet. Click “Add product”.</p></div>`;
  const draw = () => {
    const q = $('#pq').value.toLowerCase(), c = $('#pc').value;
    const list = PRODUCTS.filter((p) => (!c || p.category === c) && (!q || (p.name + p.category).toLowerCase().includes(q)));
    $('#pnone').classList.toggle('hide', list.length > 0);
    $('#prows').innerHTML = list.map((p) => `<tr class="row" data-id="${p.id}"><td>${p.images[0] ? `<img class="thumb" src="${esc(p.images[0])}" alt="">` : '<div class="thumb"></div>'}</td>
      <td><b>${esc(p.name)}</b><div class="muted">${esc(p.category)}${p.tag ? ' · ' + esc(p.tag) : ''}</div></td>
      <td>${inr(p.price * 100)}${p.mrp ? `<div class="muted" style="text-decoration:line-through">${inr(p.mrp * 100)}</div>` : ''}</td>
      <td>${p.cost ? inr(p.cost * 100) + `<div class="muted">margin ${Math.round((p.price - p.cost) / p.price * 100)}%</div>` : '<span class="muted">—</span>'}</td>
      <td>${p.stock === null ? '<span class="muted">Unlimited</span>' : p.stock <= 0 ? '<span class="pill p-cancelled">Sold out</span>' : p.stock <= 3 ? `<span class="pill p-new">${p.stock} left</span>` : p.stock}</td>
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
  const p = id ? { ...PRODUCTS.find((x) => x.id === id) } : { name: '', category: PRODUCTS[0]?.category || 'Skincare', price: '', mrp: null, description: '', tag: '', images: [], stock: null, active: 1, supplier: '', cost: 0 };
  p.images = [...(p.images || [])];
  const d = $('#drawer'); d.classList.remove('hide'); $('#scrim').classList.remove('hide'); $('#scrim').onclick = closeDrawer;
  const cats = [...new Set(PRODUCTS.map((x) => x.category))];
  const draw = () => {
    d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h2>${id ? 'Edit product' : 'New product'}</h2><button class="btn ghost sm" id="x">Close</button></div>
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
    <div class="sw"><input type="checkbox" id="p_act" ${p.active ? 'checked' : ''}><label for="p_act" style="margin:0;color:var(--fg)">Live on the store</label></div>
    <div class="savebar"><button class="btn" id="p_save">${id ? 'Save changes' : 'Create product'}</button>${id ? '<button class="btn ghost" id="p_dup">Duplicate</button><button class="btn ghost" id="p_del" style="color:var(--bad)">Delete</button>' : ''}</div>`;
    $('#x').onclick = closeDrawer;
    const keep = () => { p.name = $('#p_name').value; p.category = $('#p_cat').value; p.tag = $('#p_tag').value; p.price = $('#p_price').value; p.mrp = $('#p_mrp').value; p.description = $('#p_desc').value; p.stock = $('#p_stock').value; p.cost = $('#p_cost').value; p.supplier = $('#p_sup').value; p.active = $('#p_act').checked ? 1 : 0; };
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
  SETTINGS = await api('settings'); drawStore();
};

function drawStore() {
  const S = SETTINGS, el = $('#t-store');
  const txt = (label, path, ph = '', area = false) => `<label>${label}</label>${area ? `<textarea rows="2" data-p="${path}" placeholder="${esc(ph)}">${esc(getp(S, path))}</textarea>` : `<input data-p="${path}" value="${esc(getp(S, path))}" placeholder="${esc(ph)}">`}`;
  const num = (label, path) => `<label>${label}</label><input type="number" min="0" step="1" data-n="${path}" value="${getp(S, path)}">`;
  const chk = (label, path) => `<div class="sw"><input type="checkbox" id="c_${path}" data-b="${path}" ${getp(S, path) ? 'checked' : ''}><label for="c_${path}" style="margin:0;color:var(--fg)">${label}</label></div>`;
  const links = (path, title) => `<label>${title}</label>${getp(S, path).map((l, i) => `<div class="lrow"><input data-p="${path}.${i}.label" value="${esc(l.label)}" placeholder="Label"><input data-p="${path}.${i}.href" value="${esc(l.href)}" placeholder="/page or #section or https://"><button class="btn ghost sm" data-del="${path}.${i}">×</button></div>`).join('')}<button class="btn ghost sm" data-add="${path}">+ Add link</button>`;
  el.innerHTML = `<div class="grid three">
  <div class="card sect"><h3>Store status</h3><p class="hint">Close the store while you restock or are away. Browsing still works; checkout is blocked.</p>
    ${chk('Store is open for orders', 'store.open')}${txt('Message shown when closed', 'store.closedMessage', '', true)}
    <h3 style="margin-top:16px">Delivery charges</h3>${num('Free delivery above (₹)', 'shipping.freeShippingAbove')}${num('Delivery charge below that (₹)', 'shipping.charge')}</div>
  <div class="card sect"><h3>Top announcement bar</h3><p class="hint">A strip above the header, for offers or notices.</p>
    ${chk('Show announcement bar', 'announcement.enabled')}${txt('Text', 'announcement.text', 'Free delivery above ₹999')}${txt('Link (optional)', 'announcement.link', '#shop')}
    <h3 style="margin-top:16px">Header menu</h3>${links('header.links', 'Menu links')}</div>
  <div class="card sect"><h3>Homepage banner</h3>
    ${txt('Small line above heading', 'hero.eyebrow')}${txt('Heading', 'hero.headline')}${txt('Highlighted heading words', 'hero.accent')}${txt('Paragraph', 'hero.text', '', true)}
    ${txt('Button text', 'hero.ctaLabel')}${txt('Button link', 'hero.ctaLink', '#shop')}
    <label>Highlights under the button</label><p class="hint">Wrap words in **double stars** to make them bold.</p>
    ${S.hero.facts.map((f, i) => `<div class="lrow"><input data-p="hero.facts.${i}" value="${esc(f)}"><button class="btn ghost sm" data-del="hero.facts.${i}">×</button></div>`).join('')}<button class="btn ghost sm" data-addfact="1">+ Add highlight</button></div>
  <div class="card sect"><h3>Product section heading</h3>${txt('Small label', 'collection.label')}${txt('Heading', 'collection.title')}
    <h3 style="margin-top:16px">Three promises band</h3>${S.promise.map((x, i) => `<label>Box ${i + 1}</label><input data-p="promise.${i}.title" value="${esc(x.title)}"><textarea rows="2" data-p="promise.${i}.text" style="margin-top:6px">${esc(x.text)}</textarea>`).join('')}</div>
  <div class="card sect"><h3>Footer</h3>${txt('Copyright line', 'footer.copyright')}${txt('Note on the right', 'footer.note')}${chk('Credit Unsplash for photos (turn off once all photos are yours)', 'footer.showUnsplash')}${links('footer.links', 'Footer links')}</div>
  </div>
  <p class="muted">The WinkCasa logo, the policy pages (Returns, Shipping, Privacy, Terms, Contact) and your business details are edited by me in code, so ask whenever you need them changed.</p>
  <div class="savebar"><button class="btn" id="s_save">Save and publish</button><a class="btn ghost" href="/" target="_blank">View store</a><span class="muted">Changes appear on the store immediately.</span></div>`;
  el.querySelectorAll('[data-p]').forEach((i) => (i.oninput = () => setp(S, i.dataset.p, i.value)));
  el.querySelectorAll('[data-n]').forEach((i) => (i.oninput = () => setp(S, i.dataset.n, Number(i.value || 0))));
  el.querySelectorAll('[data-b]').forEach((i) => (i.onchange = () => setp(S, i.dataset.b, i.checked)));
  el.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { const ks = b.dataset.del.split('.'); const idx = +ks.pop(); getp(S, ks.join('.')).splice(idx, 1); drawStore(); }));
  el.querySelectorAll('[data-add]').forEach((b) => (b.onclick = () => { const a = getp(S, b.dataset.add); if (a.length >= 12) return toast('Maximum 12 links'); a.push({ label: '', href: '' }); drawStore(); }));
  el.querySelectorAll('[data-addfact]').forEach((b) => (b.onclick = () => { if (S.hero.facts.length >= 6) return toast('Maximum 6'); S.hero.facts.push(''); drawStore(); }));
  $('#s_save').onclick = async () => {
    try { const r = await api('settings', { method: 'POST', body: JSON.stringify(SETTINGS) }); SETTINGS = r.settings; toast('Published to your store'); drawStore(); } catch (e) { toast(e.message); }
  };
}
