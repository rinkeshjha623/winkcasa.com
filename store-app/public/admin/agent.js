/* Agent: switch skills on or off, run them now, and read what the agent did. */
(function () {
  let D = { skills: [], log: [], report: null, autoBlog: true };
  const LV = { alert: ['Needs you', 'p-cancelled'], warn: ['Check', 'p-cancelled'], action: ['Done', 'p-paid'], report: ['Report', 'p-ordered'], info: ['Info', 'p-ordered'] };
  const ago = (ms) => { if (!ms) return 'never'; const m = Math.round((Date.now() - ms) / 60000); return m < 2 ? 'just now' : m < 120 ? m + ' min ago' : m < 2880 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; };
  const post = (b) => api('agent', { method: 'POST', body: JSON.stringify(b) });
  window.loadAgent = async function () {
    const el = $('#t-agent'); el.innerHTML = '<p class="muted">Loading…</p>';
    try { D = await api('agent'); } catch (e) { el.innerHTML = '<p class="muted">Could not load: ' + esc(e.message) + '</p>'; return; }
    draw();
  };
  function kwCard() {
    const k = D.keywords; if (!k) return '';
    return `<div class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Keyword research</h3><button class="btn ghost sm" data-r="keyword_research">Research now</button></div>
    <p class="muted">${k.total} keywords found · ${k.gaps} have no page yet · ${k.buy} of those are buying searches. Every other skill works from this list.</p>
    ${k.top.length ? `<div class="tw"><table><thead><tr><th>Gap keyword (build a page or post)</th><th>Type</th><th>Score</th><th>Seen on</th></tr></thead><tbody>${k.top.map((x) => `<tr><td>${esc(x.kw)}</td><td>${esc(x.intent)}</td><td>${x.score}</td><td class="muted">${esc(x.sources)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No keywords yet. Press “Research now”.</p>'}
    ${k.questions.length ? `<h4 style="margin:12px 0 4px">Blog topics people ask</h4><div class="muted">${k.questions.map((x) => esc(x.kw)).join(' · ')}</div>` : ''}</div>`;
  }
  function draw() {
    const el = $('#t-agent'), needs = D.log.filter((l) => (l.level === 'alert' || l.level === 'warn') && Date.now() - Date.parse(l.at.replace(' ', 'T') + 'Z') < 3 * 86400000);
    el.innerHTML = `<div class="filters"><b style="font-size:18px">Store agent</b><span style="flex:1"></span><button class="btn" id="aRun">Run everything now</button></div>
    <p class="muted">The agent only does the skills below, with the limits written in each one. It runs about every 30 minutes by itself and each skill is on a timer. Switch any skill off to stop it.</p>
    ${D.report ? `<div class="card" style="margin-bottom:12px"><h3>${esc(D.report.title)}</h3><pre style="white-space:pre-wrap;font:inherit;margin:0">${esc(D.report.detail || '')}</pre></div>` : ''}
    ${needs.length ? `<div class="card" style="margin-bottom:12px"><h3>Needs you (${needs.length})</h3>${needs.slice(0, 8).map((l) => `<div style="padding:6px 0;border-top:1px solid rgba(128,128,128,.2)"><b>${esc(l.title)}</b><pre style="white-space:pre-wrap;font:inherit;margin:2px 0 0" class="muted">${esc(l.detail || '')}</pre></div>`).join('')}</div>` : ''}
    ${kwCard()}
    <div class="card tw" style="margin-top:12px"><table><thead><tr><th>Skill</th><th>Last run</th><th>On</th><th></th></tr></thead><tbody>${D.skills.map((s) => `<tr><td><b>${esc(s.title)}</b><div class="muted">${esc(s.about)}</div>${s.id === 'content_review' ? `<label style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" id="aBlog" style="width:auto" ${D.autoBlog ? 'checked' : ''}> Publish a passing blog draft automatically (1 a day)</label>` : ''}${s.needs ? `<div class="muted">Needs ${esc(s.needs)}</div>` : ''}</td><td>${s.locked ? '<span class="muted">not active</span>' : ago(s.last)}</td><td>${s.locked ? '' : `<input type="checkbox" data-sk="${s.id}" style="width:auto" ${s.on ? 'checked' : ''}>`}</td><td>${s.locked ? '' : `<button class="btn ghost sm" data-r="${s.id}">Run now</button>`}</td></tr>`).join('')}</tbody></table></div>
    <div class="card" style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Activity</h3><button class="btn ghost sm" id="aClr">Clear old info</button></div>${D.log.filter((l) => l.level !== 'report').slice(0, 60).map((l) => { const [t, k] = LV[l.level] || LV.info; return `<div style="padding:7px 0;border-top:1px solid rgba(128,128,128,.2)"><span class="pill ${k}">${t}</span> <b>${esc(l.title)}</b> <span class="muted">· ${esc(l.skill)} · ${fdt(l.at)}</span>${l.detail ? `<pre style="white-space:pre-wrap;font:inherit;margin:2px 0 0" class="muted">${esc(l.detail)}</pre>` : ''}</div>`; }).join('') || '<p class="muted">Nothing yet. Press “Run everything now”.</p>'}</div>`;
    const go = async (b, msg) => { try { const r = await post(b); if (msg) toast(msg(r)); loadAgent(); } catch (e) { toast(e.message); } };
    $('#aRun').onclick = (e) => { e.target.disabled = true; e.target.textContent = 'Running…'; go({ action: 'run' }, (r) => (r.note ? 'Already running, try again in a minute' : 'Ran ' + (r.ran || []).length + ' skill(s)')); };
    el.querySelectorAll('[data-sk]').forEach((c) => (c.onchange = () => go({ action: 'toggle', skill: c.dataset.sk, enabled: c.checked })));
    el.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { b.disabled = true; b.textContent = 'Running…'; go({ action: 'run', skill: b.dataset.r }, (r) => (r.ran && r.ran[0] ? (r.ran[0].error ? 'Failed: ' + r.ran[0].error : r.ran[0].summary) : 'Done')); }));
    if ($('#aBlog')) $('#aBlog').onchange = (e) => go({ action: 'autoblog', enabled: e.target.checked });
    $('#aClr').onclick = () => go({ action: 'clear' }, () => 'Cleared');
  }
})();
