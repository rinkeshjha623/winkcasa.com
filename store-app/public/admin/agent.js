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
  const STG = { research: 'Research', visual: 'Visual expert', writing: 'Writer', review: 'Manager', approved: 'Approved', rejected: 'Dropped' };
  function teamCard() {
    const t = D.team || []; if (!t.length) return '';
    const n = (s) => t.filter((x) => x.stage === s).length;
    return `<div class="card" style="margin-bottom:12px"><h3>Social team pipeline</h3><p class="muted">Research → Visual expert → Writer → Manager → scheduled. In progress: ${n('research') + n('visual') + n('writing') + n('review')} · Approved: ${n('approved')} · Dropped: ${n('rejected')}</p>
    <div class="tw"><table><thead><tr><th>Post</th><th>Desk</th><th>Notes</th></tr></thead><tbody>${t.map((x) => { let v = {}; try { v = JSON.parse(x.review_json || '{}'); } catch {} const note = (v.visual && v.visual.notes ? 'Visual: ' + v.visual.notes.join(', ') : '') + (v.manager ? ' Manager: ' + (v.manager.feedback || v.manager.note || 'ok') : ''); return `<tr><td>${esc((x.title || '').slice(0, 60))}</td><td><span class="pill ${x.stage === 'approved' ? 'p-paid' : x.stage === 'rejected' ? 'p-cancelled' : 'p-ordered'}">${STG[x.stage] || x.stage}</span></td><td class="muted">${esc(note.slice(0, 200))}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  }

  const list = (a) => '<ul style="margin:4px 0 8px 18px;padding:0">' + a.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>';
  function defHtml(id) {
    const d = D.defs && D.defs[id]; if (!d) return '';
    return `<details style="margin-top:6px"><summary style="cursor:pointer;font-weight:600">How this agent works</summary><div style="padding:6px 0"><b>${esc(d.name)}</b>: ${esc(d.role)}<br><b>When:</b> ${esc(d.when)}${d.inputs ? '<div><b>Reads:</b>' + list(d.inputs) + '</div>' : ''}<div><b>Steps:</b>${list(d.steps)}</div><b>Gives:</b> ${esc(d.gives)}${d.handsTo ? '<br><b>Hands to:</b> ' + esc(d.handsTo) : ''}<div><b>Limits:</b>${list(d.limits)}</div></div></details>`;
  }
  function playbookCard() {
    const p = D.playbook || []; if (!p.length) return '';
    return `<div class="card" style="margin-bottom:12px"><h3>A day with the agent team (India time)</h3><p class="muted">Research feeds the topic, the topic feeds the writer, graphics follow, and the final review is the only gate to publishing. Each agent also has a "How this agent works" box in the list below.</p>
    <div class="tw"><table><thead><tr><th>Time</th><th>Agent</th><th>What happens</th></tr></thead><tbody>${p.map((x) => `<tr><td><b>${esc(x.time)}</b></td><td>${esc((D.defs[x.agent] || {}).name || x.agent)}</td><td class="muted">${esc(x.what)}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
  function setupCard() {
    const s = D.setup || {}; const row = (ok, t, how) => `<tr><td>${ok ? '✅' : '⚪'}</td><td><b>${t}</b><div class="muted">${how}</div></td></tr>`;
    return `<div class="card" style="margin-bottom:12px"><h3>Data sources</h3><div class="tw"><table><tbody>
      ${row(s.gsc, 'Google Search Console', s.gsc ? 'Connected (read-only).' : 'Add secret <code>GOOGLE_SA_JSON</code> (Google service account key) in Cloudflare, then add that account\'s email as a user in Search Console.')}
      ${row(s.ga4, 'Google Analytics 4', s.ga4 ? 'Connected (read-only).' : 'Add <code>GA4_PROPERTY_ID</code>, and give the same service account Viewer access.')}
      ${row(s.bing, 'Bing Webmaster', s.bing ? 'Connected (read-only).' : 'Add secret <code>BING_WEBMASTER_KEY</code> (Bing Webmaster Tools → Settings → API access).')}
      ${row(s.keywordPlanner, 'Google Keyword Planner volumes', s.keywordPlanner ? 'Volumes imported. Re-upload a fresh CSV every month or so.' : 'Google Ads API is not connected. In Google Ads → Keyword Planner, export your keyword list as CSV and paste it below.')}
    </tbody></table></div>
    <h4 style="margin:12px 0 4px">Paste a Keyword Planner CSV</h4><textarea id="kwCsv" rows="4" style="width:100%" placeholder="Keyword,Currency,Avg. monthly searches,Competition ..."></textarea>
    <div style="margin-top:6px"><button class="btn sm" id="kwImp">Import volumes</button></div></div>`;
  }
  function researchCard() {
    const q = D.queue || [], it = D.intel || [];
    const brief = (x) => { let b = null; try { b = JSON.parse(x.brief); } catch {} return b ? `<div class="muted">Title: ${esc(b.title)}<br>Question: ${esc(b.question)}<br>Keywords: ${esc(b.keywords.join(', '))}${b.questions.length ? '<br>Also answers: ' + esc(b.questions.join(' | ')) : ''}</div>` : ''; };
    return `<div class="card" style="margin-bottom:12px"><h3>Research team hand-over to the writer</h3>
    ${q.length ? `<div class="tw"><table><thead><tr><th>Topic and brief</th><th>Status</th></tr></thead><tbody>${q.map((x) => `<tr><td><b>${esc(x.kw)}</b><div class="muted">${esc(x.why)}</div>${brief(x)}</td><td>${esc(x.status)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No topics yet. The planner runs at 10 AM, or press Run on it.</p>'}
    <h4 style="margin:12px 0 4px">Market feed (competitor blogs, competitor news, trends, public questions)</h4>
    ${it.length ? `<div class="tw"><table><thead><tr><th>Type</th><th>Item</th></tr></thead><tbody>${it.slice(0, 25).map((x) => `<tr><td class="muted">${esc(x.kind)}</td><td><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.title)}</a><div class="muted">${esc(x.source)} · ${esc(x.seen_at)}</div></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Nothing yet. The competitor watcher runs at 7 AM and 5 PM.</p>'}
    <h4 style="margin:12px 0 4px">Competitor websites to watch (their blogs). Add or remove any.</h4>
    <div style="display:flex;gap:6px"><input id="compList" style="flex:1" value="${esc((D.competitors || []).join(', '))}"><button class="btn sm" id="compSave">Save</button></div></div>`;
  }
  function draw() {
    const el = $('#t-agent'), needs = D.log.filter((l) => (l.level === 'alert' || l.level === 'warn') && Date.now() - Date.parse(l.at.replace(' ', 'T') + 'Z') < 3 * 86400000);
    el.innerHTML = `<div class="filters"><b style="font-size:18px">Store agent</b><span style="flex:1"></span><button class="btn" id="aRun">Run everything now</button></div>
    <p class="muted">The agent only does the skills below, with the limits written in each one. It runs about every 30 minutes by itself and each skill is on a timer. Switch any skill off to stop it.</p>
    ${D.report ? `<div class="card" style="margin-bottom:12px"><h3>${esc(D.report.title)}</h3><pre style="white-space:pre-wrap;font:inherit;margin:0">${esc(D.report.detail || '')}</pre></div>` : ''}
    ${needs.length ? `<div class="card" style="margin-bottom:12px"><h3>Needs you (${needs.length})</h3>${needs.slice(0, 8).map((l) => `<div style="padding:6px 0;border-top:1px solid rgba(128,128,128,.2)"><b>${esc(l.title)}</b><pre style="white-space:pre-wrap;font:inherit;margin:2px 0 0" class="muted">${esc(l.detail || '')}</pre></div>`).join('')}</div>` : ''}
    ${playbookCard()}
    ${setupCard()}
    ${researchCard()}
    ${kwCard()}
    ${teamCard()}
    <div class="card tw" style="margin-top:12px"><table><thead><tr><th>Skill</th><th>Last run</th><th>On</th><th></th></tr></thead><tbody>${D.skills.map((s) => `<tr><td><b>${esc(s.title)}</b><div class="muted">${esc(s.about)}</div>${defHtml(s.id)}${s.id === 'content_review' ? `<label style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" id="aBlog" style="width:auto" ${D.autoBlog ? 'checked' : ''}> Publish a passing blog draft automatically (1 a day)</label>` : ''}${s.needs ? `<div class="${s.missing ? '' : 'muted'}" style="${s.missing ? 'color:var(--bad)' : ''}">${s.missing ? 'Not working yet: add the secret ' + esc(s.needs) + ' in Cloudflare' : esc(s.needs) + ' is set'}</div>` : ''}</td><td>${s.locked ? '<span class="muted">not active</span>' : ago(s.last)}</td><td>${s.locked ? '' : `<input type="checkbox" data-sk="${s.id}" style="width:auto" ${s.on ? 'checked' : ''}>`}</td><td>${s.locked ? '' : `<button class="btn ghost sm" data-r="${s.id}">Run now</button>`}</td></tr>`).join('')}</tbody></table></div>
    <div class="card" style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Activity</h3><button class="btn ghost sm" id="aClr">Clear old info</button></div>${D.log.filter((l) => l.level !== 'report').slice(0, 60).map((l) => { const [t, k] = LV[l.level] || LV.info; return `<div style="padding:7px 0;border-top:1px solid rgba(128,128,128,.2)"><span class="pill ${k}">${t}</span> <b>${esc(l.title)}</b> <span class="muted">· ${esc(l.skill)} · ${fdt(l.at)}</span>${l.detail ? `<pre style="white-space:pre-wrap;font:inherit;margin:2px 0 0" class="muted">${esc(l.detail)}</pre>` : ''}</div>`; }).join('') || '<p class="muted">Nothing yet. Press “Run everything now”.</p>'}</div>`;
    const go = async (b, msg) => { try { const r = await post(b); if (msg) toast(msg(r)); loadAgent(); } catch (e) { toast(e.message); } };
    $('#aRun').onclick = (e) => { e.target.disabled = true; e.target.textContent = 'Running…'; go({ action: 'run' }, (r) => (r.note ? 'Already running, try again in a minute' : 'Ran ' + (r.ran || []).length + ' skill(s)')); };
    el.querySelectorAll('[data-sk]').forEach((c) => (c.onchange = () => go({ action: 'toggle', skill: c.dataset.sk, enabled: c.checked })));
    el.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { b.disabled = true; b.textContent = 'Running…'; go({ action: 'run', skill: b.dataset.r }, (r) => (r.ran && r.ran[0] ? (r.ran[0].error ? 'Failed: ' + r.ran[0].error : r.ran[0].summary) : 'Done')); }));
    if ($('#aBlog')) $('#aBlog').onchange = (e) => go({ action: 'autoblog', enabled: e.target.checked });
    $('#kwImp').onclick = () => { const csv = $('#kwCsv').value; if (!csv.trim()) return toast('Paste the CSV first'); go({ action: 'kwimport', csv }, (r) => r.imported ? 'Imported ' + r.imported + ' keywords' : 'No rows found. Check it is a Keyword Planner export with Keyword and Avg. monthly searches columns.'); };
    $('#compSave').onclick = () => go({ action: 'competitors', list: $('#compList').value }, () => 'Saved');
    $('#aClr').onclick = () => go({ action: 'clear' }, () => 'Cleared');
  }
})();
