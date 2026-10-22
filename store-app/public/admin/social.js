/* Social: plan, schedule and publish Instagram + Facebook posts from the admin. */
(function () {
  const IDEAS = [
    { t: 'Find your look: face shape finder', f: 'post', c: 'Let your face choose your jewellery. ✨\nOur free face shape finder: take a selfie, discover your shape, then see earrings, necklaces and hair pieces on you. It runs privately on your phone, so your photo never leaves your device.\nTry it: winkcasa.com/try', h: 'Brand' },
    { t: 'Quiz: which jewellery personality are you?', f: 'carousel', c: 'Which jewellery personality are you? ✨\n1 Statement Girl · 2 Overthinker · 3 Effortless One · 4 Layering Queen · 5 Minimalist\nComment your number and tag the friend who is #3.\nwinkcasa.com', h: 'Quiz' },
    { t: 'Earrings for your face shape', f: 'carousel', c: 'Which earrings suit your face shape? 👂\nRound, oval, square, heart or long: swipe for what flatters each one, then find yours free at winkcasa.com/try', h: 'Earrings' },
    { t: 'Claw clip: where to place it', f: 'reel', c: 'Where to place your claw clip, by face shape. 💛\nSave this for your next hair day. Find your shape at winkcasa.com/try', h: 'Hair' },
    { t: 'Necklace for your neckline', f: 'carousel', c: 'The right necklace for your neckline and face shape. ✨\nPendants, chokers, pearls and layers: swipe, then save for later.\nwinkcasa.com', h: 'Brand' },
    { t: 'Free delivery above ₹999', f: 'post', c: 'Free delivery on every order above ₹999. 🚚\nPick a few pieces, add them together, and delivery is on us.\nwinkcasa.com', h: 'Brand' },
    { t: '7-day returns', f: 'post', c: 'Not quite right? You have 7 days to return it. 💛\nShop with confidence at winkcasa.com', h: 'Brand' },
    { t: 'Poll: studs or hoops?', f: 'story', c: 'Studs or hoops? Vote on the poll sticker. 👇', h: 'Quiz' },
    { t: 'Gift guide under ₹999', f: 'carousel', c: 'Gifts she will actually wear. 🎁\nOur favourite pieces under ₹999, from earrings to hair accessories.\nwinkcasa.com', h: 'Gifting' },
    { t: 'Jewellery care tips', f: 'carousel', c: 'Keep your jewellery shining. ✨\n1 Put it on last, take it off first\n2 Keep it dry\n3 Store each piece separately\nSave this for later.', h: 'Brand' },
    { t: 'Meet the founder', f: 'post', c: 'Hi, I am Rinkesh, the founder of WinkCasa. 👋\nI started WinkCasa to bring refined, everyday jewellery and beauty tools to India, with honest prices and delivery you can count on. Say hi in the comments and tell me what you want to see next.', h: 'Brand' },
    { t: '5 types of girls in every friend group', f: 'reel', c: '5 types of girls in every friend group. Which one are you? Tag her. 😂\nwinkcasa.com', h: 'Quiz' },
  ];
  const HASH_DEFAULT = [
    { name: 'Brand', tags: '#WinkCasa #JewelleryOnline #ShopIndia #EverydayJewellery' },
    { name: 'Earrings', tags: '#Earrings #EarringsOfInstagram #StudEarrings #HoopEarrings #WinkCasa' },
    { name: 'Hair', tags: '#ClawClip #HairAccessories #HairStyleIdeas #WinkCasa' },
    { name: 'Quiz', tags: '#StyleQuiz #FaceShape #FriendGoals #TagAFriend #WinkCasa' },
    { name: 'Gifting', tags: '#GiftIdeas #GiftsForHer #JewelleryGifts #WinkCasa' },
  ];
  const SLOTS = ['12:30', '19:00', '21:00'];
  const FMT = { post: 'Post', carousel: 'Carousel', reel: 'Reel', story: 'Story' };
  const STAT = { draft: ['Draft', 'p-ordered'], scheduled: ['Scheduled', 'p-ordered'], publishing: ['Publishing', 'p-ordered'], published: ['Posted', 'p-paid'], partial: ['Partly posted', 'p-cancelled'], failed: ['Failed', 'p-cancelled'] };
  const toIst = (u) => { if (!u) return ''; const d = new Date(u.replace(' ', 'T') + 'Z'); d.setMinutes(d.getMinutes() + 330); return d.toISOString().slice(0, 16); };
  const fromIst = (v) => { if (!v) return ''; const d = new Date(v + ':00Z'); d.setMinutes(d.getMinutes() - 330); return d.toISOString().slice(0, 19).replace('T', ' '); };
  const nowIst = () => { const d = new Date(); d.setMinutes(d.getMinutes() + 330); return d.toISOString().slice(0, 16); };
  const media = (p) => { try { return JSON.parse(p.media_json) || []; } catch { return []; } };
  const results = (p) => { try { return JSON.parse(p.result_json) || {}; } catch { return {}; } };
  const isDue = (p) => p.status === 'scheduled' && p.scheduled_at && utc(p.scheduled_at) <= new Date();
  let S = { posts: [], conn: { connected: false }, library: { hashtags: [] }, view: 'list', cal: new Date(), filter: 'all' };
  const hashtags = () => (S.library.hashtags && S.library.hashtags.length ? S.library.hashtags : HASH_DEFAULT);
  const thumb = (p) => { const m = media(p)[0]; return m ? (m.type === 'video' ? '<div class="sc-th">▶</div>' : `<img class="sc-th" src="${esc(m.url)}" alt="">`) : '<div class="sc-th">–</div>'; };
  const css = document.createElement('style');
  css.textContent = `.sc-th{width:44px;height:44px;border-radius:8px;object-fit:cover;background:#1b2a26;color:#c9a96e;display:flex;align-items:center;justify-content:center;flex:none}
  .sc-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.sc-cal .h{font-size:11px;color:var(--muted,#8a8f8c);text-align:center;padding:4px}
  .sc-day{min-height:92px;border:1px solid rgba(128,128,128,.25);border-radius:8px;padding:4px;cursor:pointer;overflow:hidden}.sc-day.off{opacity:.4}.sc-day.today{border-color:#c9a96e}
  .sc-day b{font-size:11px}.sc-chip{display:block;margin-top:3px;font-size:11px;padding:2px 5px;border-radius:6px;background:rgba(201,169,110,.2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sc-chip.done{background:rgba(60,160,100,.25)}.sc-chip.bad{background:rgba(220,80,70,.25)}
  .sc-media{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0}.sc-media>div{position:relative}.sc-media img,.sc-media .v{width:74px;height:74px;border-radius:8px;object-fit:cover;background:#1b2a26;display:flex;align-items:center;justify-content:center;color:#c9a96e}
  .sc-media button{position:absolute;top:-6px;right:-6px;border:0;border-radius:50%;width:20px;height:20px;cursor:pointer}
  .sc-idea{border:1px solid rgba(128,128,128,.25);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:6px}.sc-ideas{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
  .sc-plat label{display:inline-flex;gap:6px;align-items:center;margin-right:14px}.sc-plat input{width:auto}`;
  document.head.append(css);

  window.loadSocial = async function () {
    const el = $('#t-social'); el.innerHTML = '<p class="muted">Loading…</p>';
    try { const d = await api('social'); S.posts = d.posts; S.conn = d.conn; S.library = d.library || { hashtags: [] }; } catch (e) { el.innerHTML = '<p class="muted">Could not load: ' + esc(e.message) + '</p>'; return; }
    draw();
  };

  function draw() {
    const el = $('#t-social'), due = S.posts.filter((p) => isDue(p) && !p.auto || p.status === 'failed' || p.status === 'partial');
    const dueAuto = S.posts.filter((p) => isDue(p) && p.auto);
    const rows = S.posts.filter((p) => S.filter === 'all' || (S.filter === 'upcoming' ? p.status === 'scheduled' : S.filter === 'drafts' ? p.status === 'draft' : p.status === 'published'));
    const up = S.posts.filter((p) => p.status === 'scheduled').length;
    el.innerHTML = `<div class="filters"><button class="btn" id="sNew">+ New post</button>
      <select id="sFil" style="width:auto"><option value="all">All posts</option><option value="upcoming">Scheduled (${up})</option><option value="drafts">Drafts</option><option value="posted">Posted</option></select>
      <select id="sView" style="width:auto"><option value="list">List</option><option value="cal">Calendar</option></select>
      <span style="flex:1"></span><span class="pill ${S.conn.connected ? 'p-paid' : 'p-cancelled'}">${S.conn.connected ? 'Auto-posting ON' : 'Not connected: posts are reminders'}</span><button class="btn ghost sm" id="sConn">Connections</button></div>
    ${due.length ? `<div class="card" style="margin-bottom:12px"><h3>Needs you now</h3>${due.map((p) => `<div class="row2" style="align-items:center;gap:10px;padding:8px 0;border-top:1px solid rgba(128,128,128,.2)">${thumb(p)}<div style="flex:1"><b>${esc(p.title || p.caption.slice(0, 50) || 'Untitled')}</b><div class="muted">${p.status === 'failed' || p.status === 'partial' ? 'Problem: ' + esc(Object.values(results(p)).map((r) => r.error).filter(Boolean).join(' | ')) : 'Due ' + fdt(p.scheduled_at) + ': post it by hand, then mark it done.'}</div></div><button class="btn sm" data-o="${p.id}">Open</button></div>`).join('')}</div>` : ''}
    ${dueAuto.length ? `<p class="muted">${dueAuto.length} post(s) are due and will publish on the next scheduler run (every 10 minutes), or <a href="#" id="sRun">publish now</a>.</p>` : ''}
    <div id="sBody"></div>
    <div class="card" style="margin-top:14px"><h3>Content ideas</h3><p class="muted">One click creates a draft with a ready caption and hashtags. Good times to post in India: ${SLOTS.join(', ')} IST.</p><div class="sc-ideas">${IDEAS.map((i, n) => `<div class="sc-idea"><b>${esc(i.t)}</b><span class="muted">${FMT[i.f]} · ${esc(i.c.split('\n')[0].slice(0, 70))}</span><button class="btn ghost sm" data-i="${n}">Make draft</button></div>`).join('')}</div></div>
    <div class="card" style="margin-top:14px"><h3>Hashtag sets</h3><div id="sHash"></div></div>`;
    $('#sFil').value = S.filter; $('#sView').value = S.view;
    $('#sFil').onchange = (e) => { S.filter = e.target.value; draw(); };
    $('#sView').onchange = (e) => { S.view = e.target.value; draw(); };
    $('#sNew').onclick = () => edit(null); $('#sConn').onclick = connPanel;
    el.querySelectorAll('[data-o]').forEach((b) => (b.onclick = () => edit(S.posts.find((x) => x.id == b.dataset.o))));
    el.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { const i = IDEAS[b.dataset.i], h = hashtags().find((x) => x.name === i.h); edit(null, { title: i.t, format: i.f, caption: i.c + (h ? '\n\n' + h.tags : '') }); }));
    const r = $('#sRun'); if (r) r.onclick = async (e) => { e.preventDefault(); try { const x = await api('social', { method: 'POST', body: JSON.stringify({ action: 'run' }) }); toast(x.ran ? 'Published ' + x.ran : x.note || 'Nothing due'); loadSocial(); } catch (er) { toast(er.message); } };
    S.view === 'cal' ? cal(rows) : list(rows); hashPanel();
  }

  function list(rows) {
    $('#sBody').innerHTML = `<div class="card tw"><table><thead><tr><th>Post</th><th>Format</th><th>Where</th><th>When (India)</th><th>Status</th></tr></thead><tbody>${rows.map((p) => { const [t, k] = STAT[p.status] || ['', '']; return `<tr class="row" data-o="${p.id}"><td><div style="display:flex;gap:10px;align-items:center">${thumb(p)}<div><b>${esc(p.title || 'Untitled')}</b><div class="muted">${esc(p.caption.slice(0, 70))}</div></div></div></td><td>${FMT[p.format]}</td><td>${p.platforms.split(',').map((x) => x === 'instagram' ? 'IG' : 'FB').join(' + ')}${p.auto ? '' : '<div class="muted">by hand</div>'}</td><td>${p.scheduled_at ? fdt(p.scheduled_at) : '<span class="muted">not set</span>'}</td><td><span class="pill ${k}">${t}</span></td></tr>`; }).join('') || '<tr><td colspan="5" class="muted">Nothing here yet. Tap “+ New post”, or pick an idea below.</td></tr>'}</tbody></table></div>`;
    $('#sBody').querySelectorAll('tr.row').forEach((r) => (r.onclick = () => edit(S.posts.find((x) => x.id == r.dataset.o))));
  }

  function cal(rows) {
    const c = S.cal, y = c.getFullYear(), m = c.getMonth(), first = new Date(y, m, 1), start = new Date(y, m, 1 - ((first.getDay() + 6) % 7)), today = nowIst().slice(0, 10);
    const by = {}; rows.forEach((p) => { if (p.scheduled_at) (by[toIst(p.scheduled_at).slice(0, 10)] ||= []).push(p); });
    let cells = ''; for (let i = 0; i < 42; i++) { const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      cells += `<div class="sc-day${d.getMonth() !== m ? ' off' : ''}${k === today ? ' today' : ''}" data-d="${k}"><b>${d.getDate()}</b>${(by[k] || []).map((p) => `<span class="sc-chip ${p.status === 'published' ? 'done' : p.status === 'failed' ? 'bad' : ''}" data-o="${p.id}">${toIst(p.scheduled_at).slice(11)} ${esc(p.title || p.caption.slice(0, 18))}</span>`).join('')}</div>`; }
    $('#sBody').innerHTML = `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><button class="btn ghost sm" id="cP">‹</button><b>${c.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</b><button class="btn ghost sm" id="cN">›</button></div><div class="sc-cal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => `<div class="h">${x}</div>`).join('')}${cells}</div></div>`;
    $('#cP').onclick = () => { S.cal = new Date(y, m - 1, 1); draw(); }; $('#cN').onclick = () => { S.cal = new Date(y, m + 1, 1); draw(); };
    $('#sBody').querySelectorAll('.sc-chip').forEach((x) => (x.onclick = (e) => { e.stopPropagation(); edit(S.posts.find((p) => p.id == x.dataset.o)); }));
    $('#sBody').querySelectorAll('.sc-day').forEach((x) => (x.onclick = () => edit(null, { scheduled_at: fromIst(x.dataset.d + 'T19:00') })));
  }

  async function toJpeg(file) {
    const bmp = await createImageBitmap(file), sc = Math.min(1, 1440 / Math.max(bmp.width, bmp.height)), cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc);
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(bmp, 0, 0, cv.width, cv.height);
    for (let q = 0.9; q > 0.4; q -= 0.1) { const d = cv.toDataURL('image/jpeg', q); if (d.length < 1_300_000) return d; }
    throw new Error('Image is too large.');
  }

  function edit(post, prefill) {
    const p = post ? { ...post } : { title: '', caption: '', format: 'post', platforms: 'instagram,facebook', media_json: '[]', scheduled_at: '', auto: 1, status: 'draft', note: '', ...(prefill || {}) };
    let med = media(p); const plats = new Set(p.platforms.split(',')), res = results(p), locked = p.status === 'published';
    const d = $('#drawer'); d.classList.remove('hide'); $('#scrim').classList.remove('hide'); $('#scrim').onclick = closeDrawer;
    d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h2>${post ? 'Edit post' : 'New post'}</h2><button class="btn ghost sm" id="x">Close</button></div>
    ${post && Object.keys(res).length ? `<div class="card" style="margin:8px 0">${Object.entries(res).map(([k, r]) => `<div><b>${k === 'instagram' ? 'Instagram' : 'Facebook'}:</b> ${r.ok ? 'Posted ✓' : r.pending ? 'Processing video…' : 'Failed: ' + esc(r.error || '')}</div>`).join('')}</div>` : ''}
    <label>Name (for you only)</label><input id="s_t" maxlength="120" value="${esc(p.title)}" placeholder="e.g. Face shape finder">
    <div class="row2"><div><label>Format</label><select id="s_f">${Object.entries(FMT).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div></div>
    <label>Post to</label><div class="sc-plat"><label><input type="checkbox" id="s_ig" ${plats.has('instagram') ? 'checked' : ''}> Instagram</label><label><input type="checkbox" id="s_fb" ${plats.has('facebook') ? 'checked' : ''}> Facebook Page</label></div>
    <label>Photos / video</label><div class="sc-media" id="s_m"></div>
    <div class="acts"><label class="btn ghost sm" style="cursor:pointer">+ Add photos<input type="file" id="s_file" accept="image/*" multiple hidden></label><input id="s_vurl" placeholder="…or paste a public video link (.mp4)" style="flex:1"><button class="btn ghost sm" id="s_vadd" type="button">Add video</button></div>
    <p class="muted" style="margin:4px 0">Photos are made Instagram-ready (JPG) automatically. For reels, upload your MP4 anywhere public and paste its link, or post it by hand and use “Mark as posted”.</p>
    <label>Caption <span class="muted" id="s_cnt"></span></label><textarea id="s_c" rows="7" maxlength="2200">${esc(p.caption)}</textarea>
    <div class="acts"><select id="s_h" style="width:auto"><option value="">Add hashtag set…</option>${hashtags().map((h, i) => `<option value="${i}">${esc(h.name)}</option>`).join('')}</select><button class="btn ghost sm" id="s_copy" type="button">Copy caption</button></div>
    <label>Publish at (India time)</label><input type="datetime-local" id="s_at" value="${toIst(p.scheduled_at)}">
    <label class="sw" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="s_auto" style="width:auto" ${p.auto ? 'checked' : ''}> Publish automatically at that time${S.conn.connected ? '' : ' (connect first, otherwise it stays a reminder)'}</label>
    <label>Private note</label><input id="s_n" maxlength="300" value="${esc(p.note || '')}">
    <div class="savebar" style="flex-wrap:wrap">${locked ? '' : '<button class="btn" id="s_sch">Schedule</button><button class="btn ghost" id="s_dr">Save draft</button>'}${post && !locked ? '<button class="btn ghost" id="s_now">Publish now</button>' : ''}${post && !locked ? '<button class="btn ghost" id="s_done">Mark as posted</button>' : ''}${post ? '<button class="btn ghost" id="s_dup">Duplicate</button><button class="btn ghost" id="s_del" style="color:var(--bad)">Delete</button>' : ''}</div>
    <div class="acts" style="margin-top:8px"><a class="btn ghost sm" target="_blank" rel="noopener" href="https://www.instagram.com/winkcasa.official/">Open Instagram</a><a class="btn ghost sm" target="_blank" rel="noopener" href="https://www.facebook.com/winkcasa">Open Facebook Page</a></div>`;
    $('#s_f').value = p.format;
    const paintM = () => { $('#s_m').innerHTML = med.map((m, i) => `<div>${m.type === 'video' ? '<div class="v">▶</div>' : `<img src="${esc(m.url)}" alt="">`}<button data-r="${i}" type="button">×</button></div>`).join('') || '<span class="muted">No media yet.</span>'; $('#s_m').querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { med.splice(+b.dataset.r, 1); paintM(); })); };
    paintM();
    const cnt = () => { const t = $('#s_c').value, n = (t.match(/#\w+/g) || []).length; $('#s_cnt').textContent = `${t.length}/2200 · ${n} hashtag${n === 1 ? '' : 's'}${n > 30 ? ' (Instagram allows 30)' : ''}`; }; $('#s_c').oninput = cnt; cnt();
    $('#s_h').onchange = (e) => { if (e.target.value === '') return; $('#s_c').value = $('#s_c').value.trimEnd() + '\n\n' + hashtags()[e.target.value].tags; e.target.value = ''; cnt(); };
    $('#s_copy').onclick = () => { navigator.clipboard.writeText($('#s_c').value); toast('Caption copied'); };
    $('#s_file').onchange = async (e) => { try { for (const f of e.target.files) { const r = await api('upload', { method: 'POST', body: JSON.stringify({ data: await toJpeg(f) }) }); med.push({ url: r.url, type: 'image' }); } paintM(); } catch (er) { toast(er.message); } e.target.value = ''; };
    $('#s_vadd').onclick = () => { const u = $('#s_vurl').value.trim(); if (!/^https:\/\/.+\.(mp4|mov)(\?.*)?$/i.test(u)) return toast('Paste a public https link ending in .mp4'); med.push({ url: u, type: 'video' }); $('#s_vurl').value = ''; paintM(); };
    const body = (status) => ({ id: post ? post.id : undefined, title: $('#s_t').value, caption: $('#s_c').value, format: $('#s_f').value, platforms: [$('#s_ig').checked && 'instagram', $('#s_fb').checked && 'facebook'].filter(Boolean), media: med, scheduled_at: fromIst($('#s_at').value), auto: $('#s_auto').checked, status, note: $('#s_n').value });
    const save = async (status, msg) => { try { const r = await api('social', { method: 'POST', body: JSON.stringify(body(status)) }); toast(msg); return r.id; } catch (e) { toast(e.message); return null; } };
    const done = () => { closeDrawer(); loadSocial(); };
    if ($('#s_sch')) $('#s_sch').onclick = async () => { if (await save('scheduled', $('#s_auto').checked && S.conn.connected ? 'Scheduled' : 'Scheduled as a reminder')) done(); };
    if ($('#s_dr')) $('#s_dr').onclick = async () => { if (await save('draft', 'Draft saved')) done(); };
    if ($('#s_now')) $('#s_now').onclick = async () => { if (!S.conn.connected) return toast('Connect your Facebook Page first (Connections).'); if (!confirm('Publish this to your accounts right now?')) return; const id = await save('draft', ''); if (!id) return; try { const r = await api('social', { method: 'POST', body: JSON.stringify({ action: 'publish', id }) }); toast(r.status === 'published' ? 'Posted!' : r.status === 'publishing' ? 'Instagram is processing, it will finish shortly' : 'Some parts failed, open the post to see why'); } catch (e) { toast(e.message); } done(); };
    if ($('#s_done')) $('#s_done').onclick = async () => { await api('social', { method: 'POST', body: JSON.stringify({ action: 'markposted', id: post.id }) }); toast('Marked as posted'); done(); };
    if ($('#s_dup')) $('#s_dup').onclick = async () => { const b = body('draft'); b.id = undefined; b.scheduled_at = ''; b.title = (b.title || 'Post') + ' (copy)'; await api('social', { method: 'POST', body: JSON.stringify(b) }); toast('Duplicated'); done(); };
    if ($('#s_del')) $('#s_del').onclick = async () => { if (!confirm('Delete this post from the planner? It does not remove anything already posted.')) return; await api('social', { method: 'POST', body: JSON.stringify({ action: 'delete', id: post.id }) }); toast('Deleted'); done(); };
    $('#x').onclick = closeDrawer;
  }

  function hashPanel() {
    const box = $('#sHash'); let sets = hashtags().map((h) => ({ ...h }));
    const paint = () => { box.innerHTML = sets.map((h, i) => `<div class="row2" style="gap:8px;margin-bottom:6px"><input data-n="${i}" value="${esc(h.name)}" style="max-width:130px"><input data-g="${i}" value="${esc(h.tags)}"><button class="btn ghost sm" data-x="${i}">×</button></div>`).join('') + '<div class="acts"><button class="btn ghost sm" id="hAdd">+ Add set</button><button class="btn sm" id="hSave">Save sets</button></div>';
      box.querySelectorAll('[data-n]').forEach((i) => (i.oninput = () => (sets[i.dataset.n].name = i.value))); box.querySelectorAll('[data-g]').forEach((i) => (i.oninput = () => (sets[i.dataset.g].tags = i.value)));
      box.querySelectorAll('[data-x]').forEach((b) => (b.onclick = () => { sets.splice(+b.dataset.x, 1); paint(); }));
      $('#hAdd').onclick = () => { sets.push({ name: 'New set', tags: '#' }); paint(); };
      $('#hSave').onclick = async () => { try { await api('social', { method: 'POST', body: JSON.stringify({ action: 'library', hashtags: sets }) }); S.library.hashtags = sets; toast('Saved'); } catch (e) { toast(e.message); } }; };
    paint();
  }

  function connPanel() {
    const c = S.conn, d = $('#drawer'); d.classList.remove('hide'); $('#scrim').classList.remove('hide'); $('#scrim').onclick = closeDrawer;
    d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h2>Connections</h2><button class="btn ghost sm" id="x">Close</button></div>
    ${c.connected ? `<div class="card" style="margin:10px 0"><b>Connected</b><div>Facebook Page: ${esc(c.page_name)} (${esc(c.page_id)})</div><div>Instagram: ${c.ig_username ? '@' + esc(c.ig_username) : '<span class="muted">no Instagram professional account is linked to this Page</span>'}</div><div class="muted">Token ends …${esc(c.token_tail)}</div><div class="acts" style="margin-top:8px"><button class="btn ghost sm" id="cOff" style="color:var(--bad)">Disconnect</button></div></div>` : '<p class="muted">Not connected yet. Until you connect, scheduled posts remind you to post by hand, and everything else here still works.</p>'}
    <div class="card" style="margin:10px 0"><h3>${c.connected ? 'Replace the token' : 'Connect Instagram + Facebook'}</h3>
    <ol class="muted" style="padding-left:18px;line-height:1.6"><li>Open <b>developers.facebook.com</b> and sign in with the account that manages the WinkCasa Page. Create an app (type: Business).</li><li>Add the products <b>Facebook Login for Business</b> or the Graph API Explorer. In the <b>Graph API Explorer</b>, choose your app, click <b>Get User Access Token</b> and tick: <i>pages_show_list, pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish, business_management</i>.</li><li>Press Generate, then paste the token below. It is swapped for a Page token that does not expire.</li><li>Your Instagram must be a Business or Creator account linked to the Facebook Page (Instagram: Settings, Account type, then Page).</li></ol>
    <label>Access token</label><textarea id="c_tok" rows="3" placeholder="EAAB…"></textarea><div class="savebar"><button class="btn" id="cGo">Connect</button></div></div>
    <p class="muted">The token is stored only on your server database and is never shown again in full. Posts are sent from your own account to Meta's official API.</p>`;
    $('#x').onclick = closeDrawer;
    $('#cGo').onclick = async () => { try { const r = await api('social', { method: 'POST', body: JSON.stringify({ action: 'connect', token: $('#c_tok').value }) }); toast('Connected to ' + (r.conn.page_name || 'your Page')); closeDrawer(); loadSocial(); } catch (e) { toast(e.message); } };
    if ($('#cOff')) $('#cOff').onclick = async () => { if (!confirm('Disconnect? Scheduled posts will turn into reminders.')) return; await api('social', { method: 'POST', body: JSON.stringify({ action: 'disconnect' }) }); toast('Disconnected'); closeDrawer(); loadSocial(); };
  }
})();
