/* ---------------- Reviews ----------------
   Ratings are always worked out from the reviews listed here. There is no way to type a rating or a count. */
window.loadReviews = async function () {
  const el = $('#t-reviews'); let data;
  try { data = await api('reviews'); } catch (e) { el.innerHTML = `<div class="card">${esc(e.message)}</div>`; return; }
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const byProduct = {}; data.list.filter((r) => r.status === 'approved').forEach((r) => { (byProduct[r.product] ||= []).push(r.rating); });
  const sums = Object.entries(byProduct).map(([n, a]) => `<span class="pill">${esc(n)}: ${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)} (${a.length})</span>`).join(' ') || '<span class="muted">No reviews yet.</span>';
  el.innerHTML = `<div class="card sect"><h3>Product ratings (calculated from approved reviews)</h3><div class="acts" style="flex-wrap:wrap">${sums}</div>
  <p class="hint">Buyers rate delivered orders from the Track order page and appear as <b>Verified buyer</b>. To add a review a customer sent you (WhatsApp, Instagram, email), use the form below. It shows as <b>Customer message</b>, never as verified, and you must note where it came from. Ratings and counts cannot be edited directly.</p></div>
  <div class="card sect" style="margin-top:12px"><h3>Add a customer review</h3>
  <div class="filters"><select id="rv_p">${data.products.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><input id="rv_n" placeholder="Customer name" maxlength="40"><select id="rv_r">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${stars(n)}</option>`).join('')}</select></div>
  <textarea id="rv_t" placeholder="What the customer wrote (copy their words)" maxlength="1000" style="width:100%;min-height:70px"></textarea>
  <input id="rv_s" placeholder="Where it came from, e.g. WhatsApp 18 Nov, screenshot saved" maxlength="300" style="width:100%;margin-top:8px"><div class="acts" style="margin-top:8px"><button class="btn" id="rv_add">Add review</button></div></div>
  <h3 style="margin:16px 0 8px">All reviews</h3>
  ${data.list.map((r) => `<div class="card" style="margin-bottom:10px;${r.status === 'hidden' ? 'opacity:.55' : ''}"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${esc(r.name)} <span style="color:#F5A524">${stars(r.rating)}</span></b><span class="muted">${esc(r.product)} · ${esc(String(r.created_at).slice(0, 10))} <span class="pill">${r.verified ? 'Verified buyer' : 'Customer message'}</span>${r.pinned ? ' <span class="pill">Pinned</span>' : ''}${r.status === 'hidden' ? ' <span class="pill p-bad">Hidden</span>' : ''}</span></div>
  ${r.text ? `<p style="white-space:pre-wrap;margin:8px 0">${esc(r.text)}</p>` : ''}${r.source_note ? `<div class="muted">Source: ${esc(r.source_note)}</div>` : ''}${r.order_ref ? `<div class="muted">Order ${esc(r.order_ref)}</div>` : ''}
  ${r.reply ? `<div class="muted">Your reply: ${esc(r.reply)}</div>` : ''}
  <div class="acts"><button class="btn ghost sm" data-rv="${r.status === 'hidden' ? 'show' : 'hide'}:${r.id}">${r.status === 'hidden' ? 'Show' : 'Hide'}</button><button class="btn ghost sm" data-rv="${r.pinned ? 'unpin' : 'pin'}:${r.id}">${r.pinned ? 'Unpin' : 'Pin to top'}</button><button class="btn ghost sm" data-rv="reply:${r.id}">Reply</button><button class="btn ghost sm" data-rv="delete:${r.id}">Delete</button></div></div>`).join('')}`;
  $('#rv_add').onclick = async () => {
    try {
      await api('reviews', { method: 'POST', body: JSON.stringify({ action: 'add', product_id: +$('#rv_p').value, name: $('#rv_n').value, rating: +$('#rv_r').value, text: $('#rv_t').value, source_note: $('#rv_s').value }) });
      toast('Review added'); loadReviews();
    } catch (e) { toast(e.message); }
  };
  el.querySelectorAll('[data-rv]').forEach((b) => (b.onclick = async () => {
    const [action, id] = b.dataset.rv.split(':'); const body = { action, id: +id };
    if (action === 'reply') { const v = prompt('Your public reply (leave empty to remove):'); if (v === null) return; body.reply = v; }
    if (action === 'delete' && !confirm('Delete this review permanently?')) return;
    try { await api('reviews', { method: 'POST', body: JSON.stringify(body) }); loadReviews(); } catch (e) { toast(e.message); }
  }));
};
