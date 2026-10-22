/* Advanced blog editor: markdown toolbar, live preview, and a Yoast/Rank Math style SEO · AEO · GEO panel.
   Uses helpers from index.html / editor.js: $, api, esc, toast, shrink, fdt */
(function () {
  const css = `
  .bed{position:fixed;inset:0;background:var(--bg);z-index:30;display:flex;flex-direction:column}
  .bed-top{display:flex;gap:10px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--line);flex-wrap:wrap}
  .bed-top .sp{flex:1}.bed-top h2{font-size:18px}
  .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;background:var(--mut)}.dot.good{background:var(--ok)}.dot.ok{background:var(--warn)}.dot.bad{background:var(--bad)}
  .bed-main{flex:1;display:grid;grid-template-columns:minmax(0,1fr) 400px;min-height:0}
  .bed-left{overflow:auto;padding:18px 22px}.bed-right{overflow:auto;border-left:1px solid var(--line);background:var(--card2)}
  .bed-title{font:500 30px/1.2 Georgia,serif;background:transparent;border:0;border-bottom:1px solid var(--line);border-radius:0;padding:6px 0;margin-bottom:6px}
  .perm{color:var(--mut);font-size:12px;display:flex;gap:6px;align-items:center;margin-bottom:12px;flex-wrap:wrap}.perm input{width:auto;flex:1;min-width:160px;padding:3px 8px;font-size:12px}
  .tb{display:flex;gap:4px;flex-wrap:wrap;padding:6px;border:1px solid var(--line);border-bottom:0;border-radius:8px 8px 0 0;background:var(--card);position:sticky;top:-18px;z-index:2}
  .tb button{background:transparent;border:1px solid transparent;border-radius:6px;padding:4px 9px;cursor:pointer;min-width:30px}.tb button:hover{border-color:var(--line);background:var(--card2)}
  .tb .sep{width:1px;background:var(--line);margin:2px 4px}.tb .vm{margin-left:auto;display:flex;gap:4px}.tb .vm .on{background:var(--acc);color:#1a1405}
  .ed{display:grid;grid-template-columns:1fr;border:1px solid var(--line);border-radius:0 0 8px 8px}.ed.split{grid-template-columns:1fr 1fr}
  .ed textarea{border:0;border-radius:0;min-height:56vh;resize:vertical;font:14px/1.6 ui-monospace,Menlo,Consolas,monospace;padding:14px}
  .ed .pv{padding:14px 18px;overflow:auto;max-height:70vh;border-left:1px solid var(--line);font:15px/1.7 Georgia,serif}.ed.split .pv{display:block}
  .pv h2{font-size:24px;margin:20px 0 8px}.pv h3{font-size:19px;margin:16px 0 6px}.pv img{max-width:100%}.pv blockquote{border-left:3px solid var(--acc);margin:12px 0;padding:2px 14px;color:var(--mut)}
  .pv table{border-collapse:collapse}.pv td,.pv th{border:1px solid var(--line);padding:5px 9px}.pv a{color:var(--acc)}
  .cnt{display:flex;gap:16px;color:var(--mut);font-size:12px;padding:6px 2px;flex-wrap:wrap}
  .rtabs{display:flex;flex-wrap:wrap;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--card2);z-index:2}
  .rtabs button{flex:1;background:transparent;border:0;border-bottom:2px solid transparent;padding:10px 3px;cursor:pointer;color:var(--mut);font-size:11.5px;min-width:0;white-space:nowrap}.rtabs button.on{color:var(--fg);border-color:var(--acc)}
  .rp{padding:14px 16px}.rp label{display:block;margin:12px 0 4px;color:var(--mut);font-size:12px}.rp h4{margin:16px 0 6px;font-family:Georgia,serif;font-size:15px}
  .meter{height:5px;border-radius:3px;background:var(--line);margin-top:4px;overflow:hidden}.meter i{display:block;height:100%;background:var(--ok)}.meter i.ok{background:var(--warn)}.meter i.bad{background:var(--bad)}
  .serp{background:#fff;color:#202124;border-radius:8px;padding:12px 14px;font-family:Arial,sans-serif}.serp.m{max-width:360px}.serp .u{font-size:12px;color:#4d5156}.serp .t{font-size:19px;color:#1a0dab;margin:2px 0;line-height:1.25}.serp .d{font-size:13px;color:#4d5156;line-height:1.45}
  .chk{display:flex;gap:8px;align-items:flex-start;padding:5px 0;font-size:13px;border-bottom:1px solid var(--line)}.chk .dot{margin-top:5px;flex:none}
  .soc{border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--card)}.soc img{width:100%;height:160px;object-fit:cover;display:block;background:var(--card2)}.soc div{padding:8px 10px}.soc b{display:block}.soc span{color:var(--mut);font-size:12px}
  .arow{border:1px solid var(--line);border-radius:8px;padding:8px;margin-bottom:8px;background:var(--card)}.arow input,.arow textarea{margin-bottom:6px}
  .sug{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line);font-size:13px}.sug small{color:var(--mut);display:block}
  @media(max-width:1000px){.bed-main{grid-template-columns:1fr;overflow:auto}.bed-left,.bed-right{overflow:visible}.bed-right{border-left:0;border-top:1px solid var(--line)}.ed.split{grid-template-columns:1fr}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- markdown (same rules as the live site) ---------- */
  const eh = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inl = (t) => eh(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/!\[([^\]]*)\]\(((?:https:\/\/|\/)[^\s)]+)\)/g, '<img src="$2" alt="$1">').replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g, '<a href="$2">$1</a>');
  function md(src) {
    const out = []; let list = null, tbl = null;
    const flush = () => { if (list) { out.push(`<${list.t}>` + list.i.map((l) => `<li>${inl(l)}</li>`).join('') + `</${list.t}>`); list = null; } if (tbl) { const rows = tbl.filter((r) => !(/^\|?[\s:|-]+\|?$/.test(r) && /-/.test(r))); const c = (r) => r.replace(/^\||\|$/g, '').split('|').map((x) => x.trim()); if (rows.length) out.push('<table><thead><tr>' + c(rows[0]).map((x) => `<th>${inl(x)}</th>`).join('') + '</tr></thead><tbody>' + rows.slice(1).map((r) => '<tr>' + c(r).map((x) => `<td>${inl(x)}</td>`).join('') + '</tr>').join('') + '</tbody></table>'); tbl = null; } };
    for (const line of String(src || '').split('\n')) {
      const t = line.trim(); let m;
      if (!t) { flush(); continue; }
      if ((m = /^[-*] (.*)$/.exec(t))) { if (!list || list.t !== 'ul') { flush(); list = { t: 'ul', i: [] }; } list.i.push(m[1]); continue; }
      if ((m = /^\d+[.)] (.*)$/.exec(t))) { if (!list || list.t !== 'ol') { flush(); list = { t: 'ol', i: [] }; } list.i.push(m[1]); continue; }
      if (t[0] === '|') { if (!tbl) { flush(); tbl = []; } tbl.push(t); continue; }
      flush();
      if (/^## /.test(t)) out.push(`<h2>${inl(t.slice(3))}</h2>`); else if (/^### /.test(t)) out.push(`<h3>${inl(t.slice(4))}</h3>`);
      else if (/^> ?/.test(t)) out.push(`<blockquote>${inl(t.replace(/^> ?/, ''))}</blockquote>`); else if (/^(---|\*\*\*)$/.test(t)) out.push('<hr>');
      else out.push(`<p>${inl(t)}</p>`);
    }
    flush(); return out.join('\n');
  }

  /* ---------- text analysis ---------- */
  const plain = (t) => String(t || '').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/^\s*(#{1,6}|[-*>]|\d+[.)])\s+/gm, '').replace(/[*`|]/g, ' ').replace(/\s+/g, ' ').trim();
  const wc = (t) => String(t || '').split(/\s+/).filter(Boolean).length;
  const slugw = (t) => String(t || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const has = (text, kw) => { text = String(text || '').toLowerCase(); kw = String(kw || '').toLowerCase().trim(); return !!kw && (text.includes(kw) || kw.split(/\s+/).every((w) => text.includes(w))); };
  const syl = (w) => { w = w.toLowerCase().replace(/[^a-z]/g, ''); if (w.length <= 3) return w ? 1 : 0; return Math.max(1, (w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g) || []).length); };
  const TRANS = /\b(because|therefore|however|for example|for instance|also|but|so|then|first|second|finally|next|instead|in addition|as a result|although|while|since|meanwhile|besides|moreover|similarly|overall|in short|that said|if|when)\b/i;
  const QWORD = /^(how|what|why|which|when|where|who|is|are|can|do|does|should|will)\b/i;

  function analyse(p, all) {
    const kw = (p.focus_kw || '').toLowerCase().trim(), body = p.body || '', text = plain(body), words = wc(text), lines = body.split('\n').map((l) => l.trim());
    const heads = lines.filter((l) => /^#{2,3} /.test(l)).map((l) => l.replace(/^#+ /, ''));
    const paras = lines.filter((l) => l && !/^(#|[-*>] |\||\d+[.)] |!\[|---)/.test(l));
    const title = p.seo_title || (p.title ? p.title + ' | WinkCasa' : ''), meta = p.seo_description || p.excerpt || '';
    const links = [...body.matchAll(/(?<!!)\[[^\]]+\]\(([^)\s]+)\)/g)].map((m) => m[1]), internal = links.filter((u) => u[0] === '/' || /winkcasa\.com/.test(u)), outb = links.filter((u) => /^https?:/.test(u) && !/winkcasa\.com/.test(u));
    const imgs = [...body.matchAll(/!\[([^\]]*)\]\(/g)], noalt = imgs.filter((m) => !m[1].trim()).length;
    const occ = kw ? (text.toLowerCase().split(kw).length - 1) : 0, dens = words ? occ / words * 100 : 0;
    const dup = kw && all.some((o) => o.id !== p.id && (o.focus_kw || '').toLowerCase().trim() === kw);
    const faq = p.faq.filter((f) => f.q && f.a), src = p.sources.filter((s) => s.title && s.url), tk = p.takeaways.filter(Boolean);
    const tl = wc(p.tldr);
    const R = (c, g, o, tg, to, tb) => ({ s: c === 'g' ? 'good' : c === 'o' ? 'ok' : 'bad', t: c === 'g' ? tg : c === 'o' ? to : tb });
    const seo = [];
    seo.push(kw ? R('g', 0, 0, `Focus keyphrase set: "${p.focus_kw}"`) : R('b', 0, 0, '', '', 'Set a focus keyphrase in the SEO tab: the phrase people search for.'));
    if (kw) {
      seo.push(has(title, kw) ? (title.toLowerCase().indexOf(kw.split(' ')[0]) < 12 ? R('g', 0, 0, 'Keyphrase is at the start of the SEO title.') : R('o', 0, 0, '', 'Keyphrase is in the SEO title. Moving it nearer the start helps.')) : R('b', 0, 0, '', '', 'Add the focus keyphrase to the SEO title.'));
      seo.push(has(meta, kw) ? R('g', 0, 0, 'Keyphrase appears in the meta description.') : R('b', 0, 0, '', '', 'Add the focus keyphrase to the meta description.'));
      seo.push(slugw(p.slug || p.title).includes(kw.split(/\s+/).map(slugw).join('-')) || kw.split(/\s+/).every((w) => slugw(p.slug || p.title).includes(slugw(w))) ? R('g', 0, 0, 'Keyphrase is in the web address.') : R('o', 0, 0, '', 'Put the keyphrase in the web address (slug).'));
      seo.push(paras.slice(0, 2).some((l) => has(l, kw)) ? R('g', 0, 0, 'Keyphrase is in the introduction.') : R('b', 0, 0, '', '', 'Use the focus keyphrase in the first paragraph.'));
      seo.push(heads.some((h) => has(h, kw)) ? R('g', 0, 0, 'Keyphrase appears in a subheading.') : R('o', 0, 0, '', 'Use the keyphrase (or a close variant) in at least one H2 or H3.'));
      seo.push(dens >= 0.5 && dens <= 3 ? R('g', 0, 0, `Keyphrase density ${dens.toFixed(1)}% (${occ}×). Good.`) : dens < 0.5 ? R('o', 0, 0, '', `Keyphrase used ${occ}× (${dens.toFixed(1)}%). Aim for 0.5 to 3%.`) : R('b', 0, 0, '', `Keyphrase density ${dens.toFixed(1)}% is too high. Avoid stuffing.`));
      seo.push(dup ? R('b', 0, 0, '', '', 'Another post uses this focus keyphrase. Pick a different one to avoid competing with yourself.') : R('g', 0, 0, 'Focus keyphrase is unique across your posts.'));
      seo.push(p.img_alt && has(p.img_alt, kw) ? R('g', 0, 0, 'Cover image description includes the keyphrase.') : R('o', 0, 0, '', 'Describe the cover image (alt text) using the keyphrase naturally.'));
    }
    seo.push(title.length >= 30 && title.length <= 60 ? R('g', 0, 0, `SEO title is ${title.length} characters. Good.`) : R(title.length ? 'o' : 'b', 0, 0, '', title.length > 60 ? `SEO title is ${title.length} characters and may be cut off. Keep it under 60.` : `SEO title is ${title.length} characters. Aim for 30 to 60.`, 'Add an SEO title.'));
    seo.push(meta.length >= 120 && meta.length <= 156 ? R('g', 0, 0, `Meta description is ${meta.length} characters. Good.`) : R(meta.length ? 'o' : 'b', 0, 0, '', meta.length > 156 ? `Meta description is ${meta.length} characters and may be cut off. Keep it under 156.` : `Meta description is ${meta.length} characters. Aim for 120 to 156.`, 'Add a meta description.'));
    seo.push(words >= 600 ? R('g', 0, 0, `${words} words. Good depth.`) : words >= 300 ? R('o', 0, 0, '', `${words} words. Longer, helpful posts (600+) tend to rank better.`) : R('b', 0, 0, '', '', `Only ${words} words. Aim for at least 300, ideally 600+.`));
    seo.push(heads.length >= 3 || words < 300 ? R('g', 0, 0, `${heads.length} subheading${heads.length === 1 ? '' : 's'}.`) : R('o', 0, 0, '', 'Add at least 3 H2/H3 subheadings to structure the post.'));
    seo.push(internal.length >= 2 ? R('g', 0, 0, `${internal.length} internal links.`) : R(internal.length ? 'o' : 'b', 0, 0, '', 'Add at least 2 internal links (products, collections or other posts). See the Links tab.', 'Add internal links to your products, collections or other posts (Links tab).'));
    seo.push(outb.length >= 1 ? R('g', 0, 0, `${outb.length} outbound link${outb.length > 1 ? 's' : ''} to other sites.`) : R('o', 0, 0, '', 'Link to at least one trusted outside source.'));
    seo.push(p.image ? (noalt ? R('o', 0, 0, '', `${noalt} image${noalt > 1 ? 's have' : ' has'} no description in the article.`) : R('g', 0, 0, 'Cover image set; article images have descriptions.')) : R('o', 0, 0, '', 'Add a cover image.'));
    const aeo = [];
    aeo.push(tl >= 25 && tl <= 60 ? R('g', 0, 0, `Short answer is ${tl} words. Ideal for AI answers.`) : R(tl ? 'o' : 'b', 0, 0, '', `Short answer is ${tl} words. Aim for 25 to 60.`, 'Add a Short answer (AEO tab). AI assistants quote this.'));
    aeo.push(faq.length >= 3 ? R('g', 0, 0, `${faq.length} FAQ items (adds FAQ schema).`) : R('o', 0, 0, '', 'Add at least 3 FAQ questions in the Schema tab.'));
    aeo.push(heads.some((h) => QWORD.test(h)) || p.title && QWORD.test(p.title) ? R('g', 0, 0, 'Question-style heading or title found.') : R('o', 0, 0, '', 'Phrase at least one heading as a question (How…, What…, Which…).'));
    aeo.push(tk.length >= 2 ? R('g', 0, 0, 'Key takeaways added.') : R('o', 0, 0, '', 'Add 2 to 5 key takeaways (AEO tab).'));
    const geo = [];
    geo.push(src.length >= 2 ? R('g', 0, 0, `${src.length} sources cited.`) : R(src.length ? 'o' : 'b', 0, 0, '', 'Cite at least 2 trusted sources (AEO tab). AI engines prefer cited content.', 'Add sources (AEO tab). AI engines prefer cited content.'));
    geo.push(p.author_bio ? R('g', 0, 0, 'Author bio added (trust signal).') : R('o', 0, 0, '', 'Add a short author bio to show who is behind the advice.'));
    geo.push((text.match(/\b\d[\d,.%]*\b/g) || []).length >= 3 ? R('g', 0, 0, 'Includes specific numbers or facts.') : R('o', 0, 0, '', 'Include concrete numbers, sizes or facts that can be quoted.'));
    geo.push(p.updated_at || p.id ? R('g', 0, 0, 'Updated date shows on the page after edits.') : R('o', 0, 0, '', 'Publish, then keep the post updated.'));
    // readability
    const sents = text.split(/(?<=[.!?])\s+/).filter((x) => wc(x) > 1), sw = sents.map(wc), avg = sents.length ? sw.reduce((a, b) => a + b, 0) / sents.length : 0, longP = sw.length ? sw.filter((n) => n > 25).length / sw.length * 100 : 0;
    const sy = text.split(/\s+/).filter(Boolean).reduce((a, w) => a + syl(w), 0), flesch = sents.length && words ? 206.835 - 1.015 * (words / sents.length) - 84.6 * (sy / words) : 0;
    const trans = sents.length ? sents.filter((x) => TRANS.test(x)).length / sents.length * 100 : 0;
    const maxPara = Math.max(0, ...paras.map(wc));
    let run = 0, sameStart = 0; for (let i = 1; i < sents.length; i++) { if (sents[i].split(' ')[0].toLowerCase() === sents[i - 1].split(' ')[0].toLowerCase()) { run++; if (run >= 2) sameStart++; } else run = 0; }
    const sections = body.split(/^#{2,3} .*$/m).map((x) => wc(plain(x))), longSec = Math.max(0, ...sections);
    const rd = [];
    rd.push(words < 50 ? R('o', 0, 0, '', 'Write some text to see readability results.') : flesch >= 60 ? R('g', 0, 0, `Reading ease ${Math.round(flesch)} (easy to read).`) : flesch >= 50 ? R('o', 0, 0, '', `Reading ease ${Math.round(flesch)}. Fairly difficult: use shorter words and sentences.`) : R('b', 0, 0, '', '', `Reading ease ${Math.round(flesch)}. Hard to read: simplify the language.`));
    rd.push(avg <= 20 ? R('g', 0, 0, `Average sentence is ${Math.round(avg)} words.`) : R('o', 0, 0, '', `Average sentence is ${Math.round(avg)} words. Aim for 20 or fewer.`));
    rd.push(longP <= 25 ? R('g', 0, 0, 'Few long sentences.') : R('o', 0, 0, '', `${Math.round(longP)}% of sentences are over 25 words. Split some.`));
    rd.push(maxPara <= 150 ? R('g', 0, 0, 'Paragraph lengths are comfortable.') : R('o', 0, 0, '', 'A paragraph is over 150 words. Break it up.'));
    rd.push(longSec <= 300 ? R('g', 0, 0, 'Subheadings are well distributed.') : R('o', 0, 0, '', 'A section runs over 300 words without a subheading. Add one.'));
    rd.push(trans >= 25 || words < 100 ? R('g', 0, 0, 'Good use of transition words.') : R('o', 0, 0, '', `Only ${Math.round(trans)}% of sentences use transition words (because, however, for example…).`));
    rd.push(sameStart === 0 ? R('g', 0, 0, 'Sentence openings vary.') : R('o', 0, 0, '', 'Three or more consecutive sentences start with the same word.'));
    const rate = (a) => { const b = a.filter((x) => x.s === 'bad').length, o = a.filter((x) => x.s === 'ok').length; return b ? 'bad' : o > 1 ? 'ok' : 'good'; };
    return { groups: [['SEO', seo], ['AEO · answer engines', aeo], ['GEO · generative engines', geo], ['Readability', rd]], seo: rate(seo.concat(aeo, geo)), read: rate(rd), words, flesch };
  }

  /* ---------- list of posts ---------- */
  let ALL = [];
  const toIst = (u) => { if (!u) return ''; const d = new Date(u.replace(' ', 'T') + 'Z'); d.setMinutes(d.getMinutes() + 330); return d.toISOString().slice(0, 16); };
  const fromIst = (v) => { if (!v) return ''; const d = new Date(v + ':00Z'); d.setMinutes(d.getMinutes() - 330); return d.toISOString().slice(0, 19).replace('T', ' '); };
  const isFuture = (p) => p.published && p.published_at && new Date(p.published_at.replace(' ', 'T') + 'Z') > new Date();

  window.loadBlog = async function () {
    ALL = await api('posts'); const el = $('#t-blog'); let q = '', f = '';
    const draw = () => {
      const list = ALL.filter((p) => (!q || (p.title + ' ' + (p.focus_kw || '') + ' ' + (p.category || '')).toLowerCase().includes(q)) && (!f || (f === 'draft' ? !p.published : f === 'scheduled' ? isFuture(p) : p.published && !isFuture(p))));
      $('#brows').innerHTML = list.map((p) => `<tr class="row" data-id="${p.id}"><td><b>${esc(p.title)}</b><div class="muted">/blog/${esc(p.slug)}${p.focus_kw ? ' · 🔑 ' + esc(p.focus_kw) : ''}</div></td><td>${esc(p.category || '')}</td><td><span class="pill ${isFuture(p) ? 'p-ordered' : p.published ? 'p-paid' : 'p-new'}">${isFuture(p) ? 'Scheduled' : p.published ? 'Published' : 'Draft'}</span>${p.noindex ? ' <span class="pill p-cancelled">noindex</span>' : ''}</td><td>${fdt(p.published_at || p.created_at)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No posts match.</td></tr>';
      $('#brows').querySelectorAll('tr.row').forEach((r) => (r.onclick = () => openPost(ALL.find((x) => x.id == r.dataset.id))));
    };
    el.innerHTML = `<div class="filters"><button class="btn" id="badd">+ New post</button><input id="bq" placeholder="Search posts"><select id="bf"><option value="">All</option><option value="published">Published</option><option value="draft">Drafts</option><option value="scheduled">Scheduled</option></select></div>
    <div class="card tw"><table><thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Date</th></tr></thead><tbody id="brows"></tbody></table></div>`;
    $('#badd').onclick = () => openPost(null); $('#bq').oninput = (e) => { q = e.target.value.toLowerCase(); draw(); }; $('#bf').onchange = (e) => { f = e.target.value; draw(); }; draw();
  };

  /* ---------- the editor ---------- */
  const J = (t) => { try { const v = JSON.parse(t || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
  window.openPost = async function (post) {
    const blank = { title: '', slug: '', excerpt: '', body: '', image: '', author: 'WinkCasa Team', published: 0, published_at: '', seo_title: '', seo_description: '', focus_kw: '', extra_kw: '', canonical: '', noindex: 0, nofollow: 0, noarchive: 0, og_title: '', og_desc: '', og_image: '', tw_card: '', tw_title: '', tw_desc: '', schema_type: 'BlogPosting', tldr: '', category: '', tags: '', img_alt: '', author_bio: '', author_url: '', crumb_title: '' };
    const p = { ...blank, ...(post || {}) };
    p.faq = J(p.faq_json).map((x) => ({ ...x })); p.steps = J(p.steps_json).map((x) => ({ ...x })); p.takeaways = J(p.takeaways_json).slice(); p.sources = J(p.sources_json).map((x) => ({ ...x }));
    for (const k of ['seo_title', 'seo_description', 'focus_kw', 'extra_kw', 'canonical', 'og_title', 'og_desc', 'og_image', 'tw_card', 'tw_title', 'tw_desc', 'schema_type', 'tldr', 'category', 'tags', 'img_alt', 'author_bio', 'author_url', 'crumb_title', 'slug', 'image', 'excerpt', 'body']) if (p[k] == null) p[k] = k === 'schema_type' ? 'BlogPosting' : '';
    if (!ALL.length) { try { ALL = await api('posts'); } catch (e) { /* ignore */ } }
    let PR = []; try { PR = await api('products'); } catch (e) { /* ignore */ }
    const draftKey = 'wc_post_' + (post ? post.id : 'new'); let dirty = false, view = 'split', tab = 'analysis', timer = null;
    try { const sv = JSON.parse(localStorage.getItem(draftKey) || 'null'); if (sv && sv.body !== p.body && confirm('You have unsaved changes from an earlier session. Restore them?')) Object.assign(p, sv); } catch (e) { /* ignore */ }

    document.body.style.overflow = 'hidden';
    const root = document.createElement('div'); root.className = 'bed'; document.body.appendChild(root);
    const F = (label, k, o = {}) => {
      const v = p[k] ?? '', id = 'k_' + k, hint = o.hint ? `<div class="muted" style="font-size:11px;margin-top:3px">${o.hint}</div>` : '';
      const inp = o.rows ? `<textarea id="${id}" data-k="${k}" rows="${o.rows}" ${o.max ? `maxlength="${o.max}"` : ''} placeholder="${esc(o.ph || '')}">${esc(v)}</textarea>` : `<input id="${id}" data-k="${k}" type="${o.type || 'text'}" ${o.max ? `maxlength="${o.max}"` : ''} value="${esc(v)}" placeholder="${esc(o.ph || '')}">`;
      return `<label for="${id}">${label}${o.meter ? ` <span id="m_${k}"></span>` : ''}</label>${inp}${o.meter ? `<div class="meter"><i id="mb_${k}"></i></div>` : ''}${hint}`;
    };
    const C = (label, k) => `<label class="sw" style="display:flex;gap:8px;align-items:center;margin:8px 0;color:var(--fg)"><input type="checkbox" data-c="${k}" ${p[k] ? 'checked' : ''} style="width:auto"> ${label}</label>`;

    root.innerHTML = `<div class="bed-top"><button class="btn ghost sm" id="bBack">← Posts</button><h2>${post ? 'Edit post' : 'New post'}</h2><span id="bState" class="muted"></span><span class="sp"></span>
      <span title="SEO, AEO and GEO score"><span class="dot" id="dSeo"></span>SEO</span><span title="Readability"><span class="dot" id="dRead"></span>Readability</span>
      <a class="btn ghost sm hide" id="bView" target="_blank">View ↗</a><button class="btn ghost sm" id="bSave">Save</button><button class="btn sm" id="bPub">Publish</button></div>
      <div class="bed-main"><div class="bed-left">
        <input class="bed-title" id="k_title" data-k="title" maxlength="120" placeholder="Post title" value="${esc(p.title)}">
        <div class="perm">winkcasa.com/blog/<input id="k_slug" data-k="slug" value="${esc(p.slug)}" placeholder="auto-from-title"></div>
        <div class="tb" id="tb">
          <button data-a="h2" title="Heading 2">H2</button><button data-a="h3" title="Heading 3">H3</button><span class="sep"></span>
          <button data-a="b" title="Bold (Ctrl+B)"><b>B</b></button><button data-a="i" title="Italic (Ctrl+I)"><i>I</i></button><button data-a="code" title="Code">&lt;/&gt;</button><span class="sep"></span>
          <button data-a="ul" title="Bullet list">• List</button><button data-a="ol" title="Numbered list">1. List</button><button data-a="quote" title="Quote">❝</button><button data-a="hr" title="Divider">—</button><span class="sep"></span>
          <button data-a="link" title="Link (Ctrl+K)">🔗 Link</button><button data-a="img" title="Image">🖼 Image</button><button data-a="table" title="Table">▦ Table</button><input id="bImgFile" type="file" accept="image/*" hidden>
          <span class="vm"><button data-v="write">Write</button><button data-v="split" class="on">Split</button><button data-v="preview">Preview</button></span></div>
        <div class="ed split" id="ed"><textarea id="k_body" data-k="body" placeholder="Start writing. Use the toolbar, or type ## for a heading, - for bullets, **bold**, [text](/c/jewellery) for links.">${esc(p.body)}</textarea><div class="pv" id="pv"></div></div>
        <div class="cnt"><span id="cWords"></span><span id="cRead"></span><span id="cSave"></span></div>
        <label style="color:var(--mut);font-size:12px;margin-top:8px;display:block">Excerpt (shown in the blog list; used as meta description if you leave it blank)</label>
        <textarea id="k_excerpt" data-k="excerpt" rows="2" maxlength="300">${esc(p.excerpt)}</textarea>
      </div>
      <div class="bed-right"><div class="rtabs" id="rt"><button data-t="analysis" class="on">Score</button><button data-t="seo">SEO</button><button data-t="social">Social</button><button data-t="schema">Schema</button><button data-t="aeo">AEO·GEO</button><button data-t="publish">Publish</button><button data-t="links">Links</button></div>
        <div class="rp" id="p_analysis"></div>
        <div class="rp hide" id="p_seo">
          <div class="acts" style="margin:0 0 8px"><button class="btn ghost sm" data-ser="d">Desktop</button><button class="btn ghost sm" data-ser="m">Mobile</button></div><div id="serp"></div>
          ${F('Focus keyphrase', 'focus_kw', { ph: 'earrings for round face', max: 100, hint: 'The one phrase this post should rank for.' })}
          ${F('Related keyphrases (comma separated)', 'extra_kw', { ph: 'best earrings, drop earrings, face shape', max: 200 })}
          ${F('SEO title', 'seo_title', { max: 90, meter: 1, ph: 'Leave blank to use: title | WinkCasa' })}
          ${F('Meta description', 'seo_description', { rows: 3, max: 200, meter: 1, ph: 'Leave blank to use the excerpt.' })}
          ${F('Breadcrumb title (short)', 'crumb_title', { max: 60 })}
          <h4>Advanced</h4>${F('Canonical URL', 'canonical', { ph: 'https://… (blank = this page)', hint: 'Only change if this content was first published elsewhere.' })}
          ${C('Hide from Google and AI search (noindex)', 'noindex')}${C('Do not follow links on this page (nofollow)', 'nofollow')}${C('Do not show a cached copy (noarchive)', 'noarchive')}
        </div>
        <div class="rp hide" id="p_social"><h4 style="margin-top:0">Facebook, WhatsApp, LinkedIn</h4><div id="socfb"></div>
          ${F('Social title', 'og_title', { max: 100, ph: 'Blank = SEO title' })}${F('Social description', 'og_desc', { rows: 2, max: 220, ph: 'Blank = meta description' })}
          <label>Social image (1200×630 is ideal; blank = cover image)</label><div class="row2"><input data-k="og_image" value="${esc(p.og_image)}" placeholder="https:// or upload"><label class="btn ghost sm" style="margin:0;cursor:pointer;text-align:center">Upload<input id="ogFile" type="file" accept="image/*" hidden></label></div>
          <h4>X (Twitter) / Pinterest</h4><label>Card type</label><select data-k="tw_card"><option value="">Automatic (large image)</option><option value="summary_large_image">Large image</option><option value="summary">Small summary</option></select>
          ${F('X title', 'tw_title', { max: 100 })}${F('X description', 'tw_desc', { rows: 2, max: 220 })}</div>
        <div class="rp hide" id="p_schema"><h4 style="margin-top:0">Article schema</h4><label>Type</label><select data-k="schema_type"><option>BlogPosting</option><option>Article</option><option>NewsArticle</option><option>TechArticle</option></select>
          <div class="muted" style="font-size:11px;margin-top:4px">Author, dates, image, keywords, word count and sources are added automatically.</div>
          <h4>FAQ schema (also shown on the page)</h4><div id="faqL"></div><button class="btn ghost sm" id="faqAdd">+ Add question</button>
          <h4>How-to schema</h4><div class="muted" style="font-size:11px">For step-by-step guides. Adds HowTo structured data and a "Step by step" section.</div><div id="stepL"></div><button class="btn ghost sm" id="stepAdd">+ Add step</button></div>
        <div class="rp hide" id="p_aeo"><h4 style="margin-top:0">AEO · answer engines</h4>
          ${F('Short answer (25 to 60 words)', 'tldr', { rows: 4, max: 500, ph: 'Answer the main question in two plain sentences. ChatGPT, Gemini, Perplexity and Google quote this.' })}<div class="muted" id="tlc" style="font-size:11px"></div>
          <label>Key takeaways</label><div id="tkL"></div><button class="btn ghost sm" id="tkAdd">+ Add takeaway</button>
          <h4>GEO · generative engines</h4><label>Sources you cite</label><div id="srcL"></div><button class="btn ghost sm" id="srcAdd">+ Add source</button>
          <h4>Author trust (E-E-A-T)</h4>${F('Author bio', 'author_bio', { rows: 3, max: 400, ph: 'Who wrote this and why they can be trusted.' })}${F('Author profile link', 'author_url', { ph: 'https://…' })}</div>
        <div class="rp hide" id="p_publish"><h4 style="margin-top:0">Visibility</h4><label>Status</label><select id="stat"><option value="draft">Draft (hidden)</option><option value="publish">Published</option><option value="schedule">Scheduled</option></select>
          <div id="whenW" class="hide"><label>Publish date and time (India time)</label><input type="datetime-local" id="when"></div>
          <h4>Details</h4>${F('Author name', 'author', { max: 60 })}${F('Category', 'category', { max: 60, ph: 'Style guides' })}${F('Tags (comma separated)', 'tags', { max: 200, ph: 'earrings, face shape' })}
          <h4>Cover image</h4><div id="cov"></div><div class="row2" style="margin-top:6px"><label class="btn ghost sm" style="margin:0;cursor:pointer;text-align:center">Upload<input id="covFile" type="file" accept="image/*" hidden></label><input data-k="image" value="${esc(p.image)}" placeholder="…or https:// link"></div>
          ${F('Cover image description (alt text)', 'img_alt', { max: 160, ph: 'Describe the picture, e.g. gold drop earrings on a round face' })}
          ${post ? '<h4>Danger zone</h4><button class="btn ghost sm" id="bDel" style="color:var(--bad)">Delete this post</button>' : ''}</div>
        <div class="rp hide" id="p_links"><h4 style="margin-top:0">Internal link suggestions</h4><div class="muted" style="font-size:12px">Click Insert to add a link at your cursor (or on the selected text). Good posts link to products, collections and related articles.</div><input id="lq" placeholder="Search products, collections, posts" style="margin:8px 0"><div id="lsug"></div></div>
      </div></div>`;

    const $r = (s) => root.querySelector(s), ta = $r('#k_body');
    const flag = () => { dirty = true; $r('#bState').textContent = 'Unsaved changes'; try { localStorage.setItem(draftKey, JSON.stringify(p)); } catch (e) { /* ignore */ } };

    /* binding */
    root.addEventListener('input', (e) => { const t = e.target, k = t.dataset && t.dataset.k; if (k) { p[k] = t.value; flag(); schedule(); } });
    root.addEventListener('change', (e) => { const t = e.target; if (t.dataset && t.dataset.c) { p[t.dataset.c] = t.checked ? 1 : 0; flag(); } if (t.dataset && t.dataset.k) { p[t.dataset.k] = t.value; flag(); schedule(); } });
    $r('[data-k="tw_card"]').value = p.tw_card || ''; $r('[data-k="schema_type"]').value = p.schema_type || 'BlogPosting';

    /* toolbar */
    const sel = () => [ta.selectionStart, ta.selectionEnd];
    const put = (text, s, e) => { ta.focus(); ta.setSelectionRange(s, e); if (!document.execCommand('insertText', false, text)) { ta.setRangeText(text, s, e, 'end'); ta.dispatchEvent(new Event('input', { bubbles: true })); } };
    const wrap = (a, b, ph) => { const [s, e] = sel(), t = ta.value.slice(s, e) || ph; put(a + t + b, s, e); ta.setSelectionRange(s + a.length, s + a.length + t.length); };
    const lines = (fn) => { let [s, e] = sel(); const st = ta.value.lastIndexOf('\n', s - 1) + 1; let en = ta.value.indexOf('\n', e); if (en < 0) en = ta.value.length; const blk = ta.value.slice(st, en).split('\n').map(fn).join('\n'); put(blk, st, en); };
    const block = (t) => { const [s, e] = sel(), pre = s && ta.value[s - 1] !== '\n' ? '\n\n' : ''; put(pre + t + '\n\n', s, e); };
    const addLink = (href, label) => { const [s, e] = sel(), t = label || ta.value.slice(s, e) || 'link text'; put(`[${t}](${href})`, s, e); };
    const act = {
      h2: () => lines((l) => '## ' + l.replace(/^#{1,6} /, '')), h3: () => lines((l) => '### ' + l.replace(/^#{1,6} /, '')), b: () => wrap('**', '**', 'bold text'), i: () => wrap('*', '*', 'italic text'), code: () => wrap('`', '`', 'code'),
      ul: () => lines((l) => (/^[-*] /.test(l) ? l.slice(2) : '- ' + l)), ol: () => { let n = 0; lines((l) => (/^\d+[.)] /.test(l) ? l.replace(/^\d+[.)] /, '') : ++n + '. ' + l)); }, quote: () => lines((l) => (/^> /.test(l) ? l.slice(2) : '> ' + l)), hr: () => block('---'),
      link: () => { const u = prompt('Link address (https://… or /c/jewellery)'); if (u) addLink(u.trim()); }, table: () => block('| Style | Best for | Why it works |\n| --- | --- | --- |\n| Drop earrings | Round faces | Adds length |\n| Hoops | Square faces | Softens angles |'),
      img: () => $r('#bImgFile').click(),
    };
    $r('#tb').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.a) { act[b.dataset.a](); } if (b.dataset.v) { view = b.dataset.v; paintView(); } });
    $r('#bImgFile').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { toast('Uploading…'); const r = await api('upload', { method: 'POST', body: JSON.stringify({ data: await shrink(f) }) }); const alt = prompt('Describe the image (alt text, helps SEO and accessibility)', p.focus_kw || '') || ''; const [s, en] = sel(); put(`\n\n![${alt}](${r.url})\n\n`, s, en); } catch (err) { toast(err.message); } e.target.value = ''; };
    ta.addEventListener('keydown', (e) => { if (e.ctrlKey || e.metaKey) { const k = e.key.toLowerCase(); if (k === 'b') { e.preventDefault(); act.b(); } else if (k === 'i') { e.preventDefault(); act.i(); } else if (k === 'k') { e.preventDefault(); act.link(); } } });
    root.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } });
    const paintView = () => { $r('#ed').className = 'ed' + (view === 'split' ? ' split' : ''); ta.style.display = view === 'preview' ? 'none' : ''; $r('#pv').style.display = view === 'write' ? 'none' : 'block'; root.querySelectorAll('[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === view)); };

    /* tabs */
    const paintTab = () => { root.querySelectorAll('#rt button').forEach((b) => b.classList.toggle('on', b.dataset.t === tab)); root.querySelectorAll('.rp').forEach((d) => d.classList.toggle('hide', d.id !== 'p_' + tab)); };
    $r('#rt').onclick = (e) => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; paintTab(); if (tab === 'links') links(); } };

    /* repeaters */
    const rep = (id, arr, tpl, addBtn, blankFn, max) => {
      const box = $r(id), draw = () => { box.innerHTML = arr.map((x, i) => `<div class="arow">${tpl(x, i)}<button class="btn ghost sm" data-del="${i}">Remove</button></div>`).join(''); box.querySelectorAll('[data-f]').forEach((el) => (el.oninput = () => { const [i, f] = el.dataset.f.split('.'); if (f === '_') arr[+i] = el.value; else arr[+i][f] = el.value; flag(); schedule(); })); box.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { arr.splice(+b.dataset.del, 1); flag(); draw(); schedule(); })); };
      $r(addBtn).onclick = () => { if (arr.length >= max) return toast('Maximum ' + max); arr.push(blankFn()); flag(); draw(); };
      draw();
    };
    rep('#faqL', p.faq, (x, i) => `<input data-f="${i}.q" value="${esc(x.q)}" placeholder="Question"><textarea data-f="${i}.a" rows="3" placeholder="Short, direct answer">${esc(x.a)}</textarea>`, '#faqAdd', () => ({ q: '', a: '' }), 10);
    rep('#stepL', p.steps, (x, i) => `<input data-f="${i}.name" value="${esc(x.name)}" placeholder="Step title"><textarea data-f="${i}.text" rows="2" placeholder="What to do">${esc(x.text)}</textarea>`, '#stepAdd', () => ({ name: '', text: '' }), 12);
    rep('#tkL', p.takeaways, (x, i) => `<input data-f="${i}._" value="${esc(x)}" placeholder="One clear takeaway">`, '#tkAdd', () => '', 8);
    rep('#srcL', p.sources, (x, i) => `<input data-f="${i}.title" value="${esc(x.title)}" placeholder="Source name"><input data-f="${i}.url" value="${esc(x.url)}" placeholder="https://…">`, '#srcAdd', () => ({ title: '', url: '' }), 10);

    /* publish tab */
    const stat = $r('#stat'), when = $r('#when');
    const paintStat = () => { stat.value = !p.published ? 'draft' : isFuture(p) ? 'schedule' : 'publish'; $r('#whenW').classList.toggle('hide', stat.value !== 'schedule'); when.value = toIst(p.published_at); };
    stat.onchange = () => { if (stat.value === 'draft') { p.published = 0; } else if (stat.value === 'publish') { p.published = 1; if (isFuture(p)) p.published_at = ''; } else { p.published = 1; if (!when.value) { const d = new Date(Date.now() + 86400000); d.setMinutes(d.getMinutes() + 330); when.value = d.toISOString().slice(0, 16); p.published_at = fromIst(when.value); } } $r('#whenW').classList.toggle('hide', stat.value !== 'schedule'); flag(); };
    when.onchange = () => { p.published_at = fromIst(when.value); flag(); };
    paintStat();
    const uploadTo = (inputId, key) => { $r(inputId).onchange = async (e) => { try { toast('Uploading…'); const r = await api('upload', { method: 'POST', body: JSON.stringify({ data: await shrink(e.target.files[0]) }) }); p[key] = r.url; root.querySelector(`[data-k="${key}"]`).value = r.url; flag(); schedule(); } catch (err) { toast(err.message); } }; };
    uploadTo('#covFile', 'image'); uploadTo('#ogFile', 'og_image');

    /* links tab */
    const links = () => {
      const q = ($r('#lq').value || '').toLowerCase(), words = ((p.focus_kw || '') + ' ' + p.title + ' ' + plain(p.body).slice(0, 600)).toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      const cats = [...new Set(PR.map((x) => x.category))].map((c) => ({ t: c + ' collection', u: '/c/' + slugw(c), k: 'Collection' }));
      const cand = [...ALL.filter((o) => o.id !== p.id && o.published).map((o) => ({ t: o.title, u: '/blog/' + o.slug, k: 'Post' })), ...cats, ...PR.filter((x) => x.active).map((x) => ({ t: x.name, u: '/p/' + x.id + '-' + slugw(x.name).slice(0, 60), k: 'Product ₹' + x.price }))];
      const scored = cand.map((c) => ({ ...c, s: words.reduce((a, w) => a + (c.t.toLowerCase().includes(w) ? 1 : 0), 0) })).filter((c) => (!q || c.t.toLowerCase().includes(q)) && (q || c.s > 0)).sort((a, b) => b.s - a.s).slice(0, 12);
      $r('#lsug').innerHTML = scored.map((c, i) => `<div class="sug"><div>${esc(c.t.slice(0, 70))}<small>${esc(c.k)} · ${esc(c.u.slice(0, 50))}</small></div><button class="btn ghost sm" data-ins="${i}">Insert</button></div>`).join('') || '<div class="muted" style="padding:8px 0">No matches yet. Add a focus keyphrase or search above.</div>';
      $r('#lsug').querySelectorAll('[data-ins]').forEach((b) => (b.onclick = () => { const c = scored[+b.dataset.ins]; addLink(c.u, ta.value.slice(...sel()) ? '' : c.t); }));
    };
    $r('#lq').oninput = links;

    /* previews + analysis */
    let serMode = 'd';
    root.querySelectorAll('[data-ser]').forEach((b) => (b.onclick = () => { serMode = b.dataset.ser; paint(); }));
    const meter = (k, lo, hi, over) => { const n = (p[k] || '').length, el = $r('#mb_' + k); if (!el) return; el.style.width = Math.min(100, n / over * 100) + '%'; el.className = n === 0 ? 'bad' : n >= lo && n <= hi ? '' : 'ok'; $r('#m_' + k).textContent = n + ' chars'; };
    const paint = () => {
      const a = analyse(p, ALL), title = p.seo_title || (p.title ? p.title + ' | WinkCasa' : 'Post title'), meta = p.seo_description || p.excerpt || 'Add a meta description.', slug = slugw(p.slug || p.title);
      $r('#pv').innerHTML = md(p.body) || '<p class="muted">Nothing to preview yet.</p>';
      $r('#cWords').textContent = a.words + ' words'; $r('#cRead').textContent = Math.max(1, Math.round(a.words / 200)) + ' min read'; $r('#cSave').textContent = '';
      $r('#dSeo').className = 'dot ' + a.seo; $r('#dRead').className = 'dot ' + a.read;
      $r('#serp').innerHTML = `<div class="serp ${serMode === 'm' ? 'm' : ''}"><div class="u">winkcasa.com › blog › ${esc(slug || '…')}</div><div class="t">${esc(title.slice(0, serMode === 'm' ? 60 : 62))}</div><div class="d">${esc(meta.slice(0, serMode === 'm' ? 120 : 158))}</div></div>`;
      const og = p.og_image || p.image;
      $r('#socfb').innerHTML = `<div class="soc">${og ? `<img src="${esc(og)}" alt="">` : '<img alt="">'}<div><span>winkcasa.com</span><b>${esc((p.og_title || title).slice(0, 90))}</b><span>${esc((p.og_desc || meta).slice(0, 140))}</span></div></div>`;
      $r('#cov').innerHTML = p.image ? `<img src="${esc(p.image)}" alt="" style="max-width:100%;border-radius:8px;border:1px solid var(--line)">` : '<div class="muted">No cover image yet.</div>';
      meter('seo_title', 30, 60, 70); meter('seo_description', 120, 156, 200);
      const tl = wc(p.tldr); $r('#tlc').textContent = tl + ' words' + (tl && (tl < 25 || tl > 60) ? ' (aim for 25 to 60)' : '');
      $r('#p_analysis').innerHTML = `<div class="card" style="margin-bottom:10px"><b><span class="dot ${a.seo}"></span>SEO · AEO · GEO</b> &nbsp; <b><span class="dot ${a.read}"></span>Readability</b><div class="muted" style="margin-top:4px">Like Yoast and Rank Math, but also scores how ready this post is for AI answers. Aim for green on everything that matters to you.</div></div>` +
        a.groups.map(([n, items]) => `<h4>${n}</h4>` + items.map((x) => `<div class="chk"><span class="dot ${x.s}"></span><span>${esc(x.t)}</span></div>`).join('')).join('');
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(paint, 250); };
    paintView(); paintTab(); paint();

    /* save, publish, delete, close */
    const close = () => { if (dirty && !confirm('Leave without saving your changes?')) return; document.body.style.overflow = ''; root.remove(); loadBlog(); };
    const save = async (publishNow) => {
      if (publishNow === true) { p.published = 1; if (isFuture(p)) p.published_at = ''; paintStat(); }
      if (!p.title.trim()) return toast('Enter a title first.');
      try {
        $r('#bState').textContent = 'Saving…';
        const r = await api('posts', { method: 'POST', body: JSON.stringify({ ...p, id: post ? post.id : p.id }) });
        p.id = r.id; p.slug = r.slug; $r('#k_slug').value = r.slug; if (!post) post = { id: r.id }; dirty = false; try { localStorage.removeItem(draftKey); } catch (e) { /* ignore */ }
        $r('#bState').textContent = 'Saved ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); toast(publishNow === true ? 'Published' : 'Saved');
        const v = $r('#bView'); v.href = '/blog/' + r.slug; v.classList.toggle('hide', !p.published); ALL = await api('posts'); paintStat(); paint();
      } catch (err) { $r('#bState').textContent = 'Not saved'; toast(err.message); }
    };
    $r('#bBack').onclick = close; $r('#bSave').onclick = () => save(); $r('#bPub').onclick = () => save(true);
    if (post && post.slug) { const v = $r('#bView'); v.href = '/blog/' + post.slug; if (p.published) v.classList.remove('hide'); }
    if ($r('#bDel')) $r('#bDel').onclick = async () => { if (!confirm('Delete this post permanently?')) return; try { await api('posts?id=' + post.id, { method: 'DELETE' }); dirty = false; try { localStorage.removeItem(draftKey); } catch (e) { /* ignore */ } toast('Deleted'); document.body.style.overflow = ''; root.remove(); loadBlog(); } catch (err) { toast(err.message); } };
    window.onbeforeunload = () => (dirty ? 'Unsaved changes' : undefined);
  };

  /* ---------- comments moderation ---------- */
  window.loadComments = async function () {
    const el = $('#t-comments'), d = await api('comments'); let only = true;
    const draw = () => {
      const list = d.list.filter((c) => !only || c.status === 'pending');
      el.innerHTML = `<div class="card" style="margin-bottom:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><label class="sw" style="margin:0;display:flex;gap:8px;align-items:center"><input type="checkbox" id="cOn" style="width:auto" ${d.enabled ? 'checked' : ''}> <b>Comments on blog posts are ${d.enabled ? 'ON' : 'OFF'}</b></label><span class="muted" style="flex:1">When ON, readers can comment. Nothing appears on the site until you approve it here.</span><label class="sw" style="margin:0"><input type="checkbox" id="cNew" style="width:auto" ${only ? 'checked' : ''}> Only waiting for review</label></div>
      ${list.map((c) => `<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${esc(c.name)}</b><span class="muted">${fdt(c.created_at)} <span class="pill ${c.status === 'pending' ? 'p-new' : c.status === 'approved' ? 'p-paid' : 'p-cancelled'}">${c.status}</span></span></div>
        <div class="muted">${esc(c.email || 'no email')} · on <a href="/blog/${esc(c.post_slug || '')}" target="_blank" style="color:var(--acc)">${esc((c.post_title || 'deleted post').slice(0, 60))}</a></div><p style="white-space:pre-wrap;margin:8px 0">${esc(c.body)}</p>
        <textarea rows="2" id="r${c.id}" placeholder="Reply as WinkCasa (shown under the comment)">${esc(c.reply || '')}</textarea>
        <div class="acts"><button class="btn sm" data-a="approve:${c.id}">Approve</button><button class="btn ghost sm" data-a="reply:${c.id}">Save reply &amp; approve</button><button class="btn ghost sm" data-a="spam:${c.id}">Spam</button><button class="btn ghost sm" data-a="delete:${c.id}" style="color:var(--bad)">Delete</button></div></div>`).join('') || '<p class="muted">Nothing to review.</p>'}`;
      $('#cNew').onchange = (e) => { only = e.target.checked; draw(); };
      $('#cOn').onchange = async (e) => { await api('comments', { method: 'POST', body: JSON.stringify({ action: 'toggle', enabled: e.target.checked }) }); d.enabled = e.target.checked; toast(d.enabled ? 'Comments are ON' : 'Comments are OFF'); draw(); };
      el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = async () => { const [a, id] = b.dataset.a.split(':'); if (a === 'delete' && !confirm('Delete this comment?')) return; await api('comments', { method: 'POST', body: JSON.stringify({ action: a, id: +id, reply: a === 'reply' ? $('#r' + id).value : undefined }) }); const c = d.list.find((x) => x.id == id); if (a === 'delete') d.list = d.list.filter((x) => x.id != id); else { c.status = a === 'spam' ? 'spam' : 'approved'; if (a === 'reply') c.reply = $('#r' + id).value; } draw(); }));
    };
    draw();
  };
})();
