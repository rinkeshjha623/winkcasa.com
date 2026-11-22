/* Agent tab: overview, how the team works, the team, content and research, data sources, activity. */
(function () {
  const U = window.AgentUtil;
  let D = { skills: [], log: [], report: null, autoBlog: true, defs: {}, playbook: [], intel: [], queue: [], setup: {}, competitors: [], keywords: null, team: [] };
  let view = 'overview', openCard = {};
  try { view = localStorage.getItem('wc_agent_view') || 'overview'; } catch {}
  const post = (b) => api('agent', { method: 'POST', body: JSON.stringify(b) });
  const SK = (id) => D.skills.find((s) => s.id === id) || {};
  const nameOf = (id) => (D.defs[id] && D.defs[id].name) || SK(id).title || id;
  const ago = (ms) => { if (!ms) return 'never'; const m = Math.round((Date.now() - ms) / 60000); return m < 2 ? 'just now' : m < 120 ? m + ' min ago' : m < 2880 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; };
  const ul = (a) => '<ul class="ag-ul">' + (a || []).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>';

  const CSS = `
  .ag{max-width:1080px;margin:0 auto}
  .ag h2{font-size:26px}.ag h3{font-size:19px;margin-bottom:6px}.ag h4{font-size:14px;margin:0 0 6px;color:var(--fg);font-weight:600}
  .ag-top{display:flex;gap:20px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;margin:6px 0 22px}
  .ag-top p{margin:6px 0 0;max-width:640px;color:var(--mut);font-size:14px;line-height:1.55}
  .ag-nav{display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--line);margin-bottom:26px;padding-bottom:0}
  .ag-nav button{background:none;border:0;border-bottom:2px solid transparent;padding:11px 16px;color:var(--mut);cursor:pointer;font-weight:500;margin-bottom:-1px}
  .ag-nav button:hover{color:var(--fg)}.ag-nav button.on{color:var(--acc);border-bottom-color:var(--acc)}
  .ag-sec{margin-bottom:34px}.ag-sec>h3{margin-bottom:4px}.ag-sub{color:var(--mut);margin:0 0 16px;line-height:1.55;max-width:760px}
  .ag-cards{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
  .ag-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px}
  .ag-stat .l{color:var(--mut);font-size:12px;letter-spacing:.04em;text-transform:uppercase}.ag-stat .v{font-family:Georgia,serif;font-size:32px;margin:6px 0 2px}.ag-stat .s{color:var(--mut);font-size:13px}
  .ag-stat.bad{border-color:#6f3333}.ag-stat.bad .v{color:var(--bad)}.ag-stat.good .v{color:var(--ok)}
  .ag-item{padding:16px 0;border-top:1px solid var(--line)}.ag-item:first-child{border-top:0;padding-top:4px}
  .ag-item .h{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.ag-item .t{font-weight:600}.ag-item .m{color:var(--mut);font-size:12px;margin-left:auto}
  .ag-item pre{white-space:pre-wrap;font:inherit;margin:8px 0 0;color:var(--mut);line-height:1.6;font-size:13px}
  .ag-pill{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;border:1px solid var(--line);color:var(--mut);white-space:nowrap}
  .ag-pill.bad{color:var(--bad);border-color:#6f3333}.ag-pill.warn{color:var(--warn);border-color:#6b5a1f}.ag-pill.ok{color:var(--ok);border-color:#2f6b4c}.ag-pill.info{color:var(--blue);border-color:#30506f}.ag-pill.acc{color:var(--acc);border-color:#6b5628}
  .ag-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px 28px}.ag-kv div b{display:block;font-family:Georgia,serif;font-size:22px;font-weight:500}.ag-kv div span{color:var(--mut);font-size:12px}
  .ag-flow{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;counter-reset:s}
  .ag-step{position:relative;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 18px 18px;counter-increment:s}
  .ag-step:before{content:counter(s);position:absolute;top:-13px;left:18px;width:26px;height:26px;border-radius:50%;background:var(--acc);color:#1a1405;font-weight:700;display:grid;place-items:center;font-size:13px}
  .ag-step h4{margin-top:4px;font-size:15px}.ag-step p{margin:4px 0 8px;color:var(--mut);font-size:13px;line-height:1.5}.ag-step small{display:block;color:var(--acc);font-size:12px;line-height:1.5}
  @media(max-width:980px){.ag-flow{grid-template-columns:1fr 1fr}}@media(max-width:560px){.ag-flow{grid-template-columns:1fr}}
  .ag-time{position:relative;margin:4px 0 0 8px;padding-left:26px;border-left:2px solid var(--line)}
  .ag-time>div{position:relative;padding:0 0 18px}.ag-time>div:before{content:"";position:absolute;left:-33px;top:5px;width:12px;height:12px;border-radius:50%;background:var(--bg);border:2px solid var(--acc)}
  .ag-time b{font-family:Georgia,serif;font-size:17px;margin-right:10px}.ag-time .w{font-weight:600}.ag-time .d{color:var(--mut);font-size:13px;margin-top:2px}
  .ag-two{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:820px){.ag-two{grid-template-columns:1fr}}
  .ag-ul{margin:6px 0 4px;padding-left:20px;line-height:1.65;color:var(--fg)}.ag-ul li{margin:2px 0}
  .ag-grp{margin-bottom:30px}.ag-grp>h3{margin-bottom:2px}.ag-grp>.ag-sub{margin-bottom:14px}
  .ag-agent{background:var(--card);border:1px solid var(--line);border-radius:14px;margin-bottom:12px;overflow:hidden}
  .ag-agent .top{display:flex;gap:16px;align-items:center;padding:18px 20px;flex-wrap:wrap}
  .ag-agent .who{flex:1;min-width:240px}.ag-agent .who b{font-size:16px}.ag-agent .who p{margin:4px 0 0;color:var(--mut);font-size:13px;line-height:1.5}
  .ag-agent .meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .ag-agent .det{border-top:1px solid var(--line);padding:18px 22px;background:var(--card2)}
  .ag-agent .det .ag-two{gap:22px}
  .ag-dot{width:9px;height:9px;border-radius:50%;display:inline-block;background:var(--mut);margin-right:6px}.ag-dot.on{background:var(--ok)}.ag-dot.miss{background:var(--warn)}
  .ag-sw{position:relative;width:44px;height:24px;flex:0 0 auto}.ag-sw input{opacity:0;width:44px;height:24px;margin:0;position:absolute;inset:0;cursor:pointer;z-index:1}
  .ag-sw i{position:absolute;inset:0;background:var(--line);border-radius:99px;transition:.15s}.ag-sw i:after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--fg);transition:.15s}
  .ag-sw input:checked+i{background:#2f6b4c}.ag-sw input:checked+i:after{left:23px}
  .ag-link{background:none;border:0;color:var(--acc);cursor:pointer;padding:0;font-weight:600}
  .ag-chips{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.ag-chips button{background:var(--card2);border:1px solid var(--line);color:var(--mut);padding:6px 14px;border-radius:99px;cursor:pointer}.ag-chips button.on{color:var(--acc);border-color:var(--acc)}
  .ag-list a{color:var(--fg);text-decoration:none}.ag-list a:hover{color:var(--acc)}
  .ag-li{padding:12px 0;border-top:1px solid var(--line)}.ag-li:first-child{border-top:0}.ag-li .s{color:var(--mut);font-size:12px;margin-top:2px}
  .ag-src{display:flex;gap:16px;align-items:flex-start;padding:18px 0;border-top:1px solid var(--line)}.ag-src:first-child{border-top:0}.ag-src>div:last-child{flex:1}.ag-src b{font-size:15px}
  .ag-src p{margin:4px 0 0;color:var(--mut);line-height:1.6;font-size:13px}
  .ag code{background:var(--card2);border:1px solid var(--line);border-radius:6px;padding:1px 6px;font-size:12px}
  .ag textarea{min-height:110px}.ag .row{display:flex;gap:10px}.ag .row input{flex:1}
  .ag-empty{color:var(--mut);padding:8px 0}
  `;

  function stat(l, v, s, cls) { return `<div class="ag-card ag-stat ${cls || ''}"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div>`; }
  const pill = (t, c) => `<span class="ag-pill ${c || ''}">${esc(t)}</span>`;

  // ---------- views ----------
  function vOverview() {
    const on = D.skills.filter((s) => s.on && !s.locked).length, total = D.skills.filter((s) => !s.locked).length;
    const needs = U.needsYou(D.log);
    const pending = (D.queue || []).filter((q) => q.status === 'pending').length;
    const ranAt = Math.max(0, ...D.skills.map((s) => s.last || 0));
    const rep = D.report;
    const lines = rep && rep.detail ? rep.detail.split('\n') : [];
    const kv = lines.filter((l) => /^(Yesterday|Last 7|Last 30|Orders in progress)/.test(l)).map((l) => { const i = l.indexOf(':'); return `<div><b>${esc(l.slice(i + 1).trim())}</b><span>${esc(l.slice(0, i))}</span></div>`; }).join('');
    const extra = lines.find((l) => /^Live products/.test(l));
    return `
    <div class="ag-sec"><div class="ag-cards">
      ${stat('Agents working', `${on}<small style="font-size:16px;color:var(--mut)"> / ${total}</small>`, 'Last activity ' + ago(ranAt), on ? 'good' : '')}
      ${stat('Need you', needs.length, needs.length ? 'Open the list below' : 'Nothing is waiting for you', needs.length ? 'bad' : 'good')}
      ${stat('Topics queued', pending, 'Waiting for the content writer')}
      ${stat('Blog drafts', (D.report && /Blog drafts: (\d+)/.exec(D.report.detail || '') || [0, 0])[1], 'Waiting for the final review')}
    </div></div>
    <div class="ag-sec"><h3>Needs you</h3><p class="ag-sub">Problems the agents could not fix alone. A problem disappears here once a later run of the same agent succeeds.</p>
      <div class="ag-card">${needs.length ? needs.slice(0, 8).map((l) => `<div class="ag-item"><div class="h"><span class="t">${esc(l.title)}</span>${pill(l.level === 'alert' ? 'Needs you' : 'Check', l.level === 'alert' ? 'bad' : 'warn')}${l.count > 1 ? pill(l.count + ' times', '') : ''}<span class="m">${esc(nameOf(l.skill))} · ${esc(U.fmtIst(l.at))}</span></div>${l.detail ? `<pre>${esc(l.detail.length > 600 ? l.detail.slice(0, 600) + '…' : l.detail)}</pre>` : ''}</div>`).join('') : '<div class="ag-empty">All clear. Nothing needs your attention.</div>'}</div></div>
    ${rep ? `<div class="ag-sec"><h3>${esc(rep.title)}</h3><p class="ag-sub">Written every morning at 8 AM India time.</p><div class="ag-card"><div class="ag-kv">${kv}</div>${extra ? `<p class="muted" style="margin:18px 0 0">${esc(extra)}</p>` : ''}</div></div>` : ''}`;
  }

  function vGuide() {
    const d = D.defs, pb = D.playbook || [];
    return `
    <div class="ag-sec"><h3>How the agent team works</h3>
      <p class="ag-sub">Think of it as a small marketing department that works every day. Each agent does one job, hands the result to the next, and only the final review can publish. You can switch any agent off, and nothing goes live that has not passed the checks.</p>
      <div class="ag-flow">
        <div class="ag-step"><h4>Research</h4><p>Watches rivals and the market, reads what shoppers ask, and checks your search data.</p><small>${[d.market_watch, d.social_listening, d.insights].filter(Boolean).map((x) => esc(x.name)).join('<br>')}</small></div>
        <div class="ag-step"><h4>Plan</h4><p>Picks what to write: the highest searches, lower competition first on a tie, with a brief for the writer.</p><small>${esc((d.topic_planner || {}).name || '')}</small></div>
        <div class="ag-step"><h4>Create</h4><p>Writes the blog article and the social post, then makes branded graphics from your real photos.</p><small>${esc((d.content_writer || {}).name || '')}<br>${esc((d.social_visual || {}).name || '')}</small></div>
        <div class="ag-step"><h4>Check and publish</h4><p>Checks facts, claims, links and the SEO list. Only a post that passes goes live.</p><small>${esc((d.content_review || {}).name || '')}<br>${esc((d.social_manager || {}).name || '')}</small></div>
        <div class="ag-step"><h4>Learn</h4><p>The next morning the research reads results and rivals again, and the plan improves.</p><small>Every day</small></div>
      </div></div>
    <div class="ag-sec"><h3>A day with the team</h3><p class="ag-sub">All times are India time. Agents wake up about every 30 minutes and do whatever is due.</p>
      <div class="ag-card"><div class="ag-time">${pb.map((x) => `<div><b>${esc(x.time)}</b><span class="w">${esc((d[x.agent] || {}).name || x.agent)}</span><div class="d">${esc(x.what)}</div></div>`).join('')}</div></div></div>
    <div class="ag-sec"><div class="ag-two">
      <div class="ag-card"><h3>Rules every agent follows</h3>${ul(['Only real product facts are used. No invented prices, reviews, materials or claims.', 'No medical or health claims, and no words like guaranteed or miracle.', 'Agents never post or comment as you on other sites. They read public pages only.', 'Nothing is published without passing the final review.', 'Search Console, Analytics and Bing are read-only.', 'Every action is written to the Activity list, so you can see what was done.'])}</div>
      <div class="ag-card"><h3>What you do</h3>${ul(['Connect the data sources once (Data sources tab).', 'Upload a Keyword Planner CSV about once a month for search volumes.', 'Skim the published post and the social post each day.', 'Reply yourself to the public questions the research agent finds.', 'Fix anything listed under Needs you.'])}</div>
    </div></div>`;
  }

  function agentCard(s) {
    const df = D.defs[s.id], on = s.on && !s.locked;
    const sched = df && df.when ? U.scheduleLabel(s) : U.scheduleLabel(s);
    const state = s.locked ? ['Not active', ''] : s.missing ? ['Needs key', 'warn'] : on ? ['On', 'ok'] : ['Off', ''];
    const open = !!openCard[s.id];
    return `<div class="ag-agent"><div class="top">
      <div class="who"><b>${esc(nameOf(s.id))}</b><p>${esc(df ? df.role : U.firstSentence(s.about))}</p></div>
      <div class="meta">${pill(state[0], state[1])}${pill(sched, 'info')}<span class="muted" style="font-size:12px">Last run ${ago(s.last)}</span></div>
      <div class="meta">${s.locked ? '' : `<button class="btn ghost sm" data-r="${s.id}">Run now</button><label class="ag-sw" title="Switch on or off"><input type="checkbox" data-sk="${s.id}" ${on ? 'checked' : ''}><i></i></label>`}
      <button class="ag-link" data-open="${s.id}">${open ? 'Hide details' : 'Details'}</button></div>
    </div>${open ? `<div class="det">${s.missing ? `<p style="color:var(--warn)">Needs <code>${esc(s.needs)}</code> on the server before it can run.</p>` : ''}${df ? `<div class="ag-two"><div><h4>When</h4><p class="muted" style="margin:0 0 14px">${esc(df.when)}</p><h4>Reads</h4>${ul(df.inputs)}<h4 style="margin-top:12px">Gives</h4><p class="muted" style="margin:0">${esc(df.gives)}</p>${df.handsTo ? `<h4 style="margin-top:12px">Hands to</h4><p class="muted" style="margin:0">${esc(df.handsTo)}</p>` : ''}</div><div><h4>What it does</h4>${ul(df.steps)}<h4 style="margin-top:12px">Limits</h4>${ul(df.limits)}</div></div>` : `<p class="muted" style="margin:0">${esc(s.about)}</p>`}${s.id === 'content_review' ? `<label style="display:flex;gap:10px;align-items:center;margin-top:16px;color:var(--fg)"><input type="checkbox" id="aBlog" ${D.autoBlog ? 'checked' : ''} style="width:auto"> Publish a passing blog draft automatically (1 a day)</label>` : ''}</div>` : ''}</div>`;
  }
  function vTeam() {
    return `<p class="ag-sub">Each agent below can be switched on or off, run right now, and opened for its full definition: what it reads, what it does, what it gives, and its limits.</p>` +
      U.GROUPS.map((g) => { const list = g.ids.map((id) => D.skills.find((s) => s.id === id)).filter(Boolean); return list.length ? `<div class="ag-grp"><h3>${esc(g.title)}</h3><p class="ag-sub">${esc(g.blurb)}</p>${list.map(agentCard).join('')}</div>` : ''; }).join('');
  }

  function brief(x) { let b = null; try { b = JSON.parse(x.brief); } catch {} return b ? `<div class="ag-two" style="margin-top:12px;gap:18px"><div><h4>Blog title</h4><p class="muted" style="margin:0">${esc(b.title)}</p><h4 style="margin-top:10px">Main question</h4><p class="muted" style="margin:0">${esc(b.question)}</p></div><div><h4>Keywords</h4><p class="muted" style="margin:0">${esc(b.keywords.join(', '))}</p>${b.questions.length ? `<h4 style="margin-top:10px">Also answers</h4>${ul(b.questions)}` : ''}</div></div>` : ''; }
  const KIND = { competitor: 'Rival blog posts', 'competitor-news': 'News about rivals', news: 'Trend headlines', reddit: 'Public questions (Reddit)' };
  function vContent() {
    const q = D.queue || [], it = D.intel || [], k = D.keywords;
    const groups = Object.keys(KIND).map((kind) => ({ kind, rows: it.filter((x) => x.kind === kind) })).filter((g) => g.rows.length);
    return `
    <div class="ag-sec"><h3>Topics for the writer</h3><p class="ag-sub">The research team's hand-over. Each topic comes with the title, main question, keywords and questions the article should answer.</p>
      ${q.length ? q.map((x) => `<div class="ag-card" style="margin-bottom:14px"><div class="h" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b style="font-size:16px">${esc(x.kw)}</b>${pill(x.status, x.status === 'pending' ? 'warn' : 'ok')}</div><p class="muted" style="margin:6px 0 0">${esc(x.why)}</p>${brief(x)}</div>`).join('') : '<div class="ag-card ag-empty">No topics yet. The planner runs at 10 AM, or open the Team tab and press Run now on it.</div>'}</div>
    <div class="ag-sec"><h3>AI citation prompts</h3><p class="ag-sub">Questions shoppers are likely to ask an AI assistant, built from your categories and real shopper questions. Nobody can read what people actually type into ChatGPT, Claude or Perplexity, so these are likely prompts, not logs. Gemini with Google Search is tested daily to see if WinkCasa is cited. To check the others, copy a prompt into them yourself.</p>
      <div class="ag-card">${(D.aiprompts || []).length ? `<div class="tw"><table><thead><tr><th>Prompt</th><th>Type</th><th>WinkCasa in Gemini</th><th>Sites cited instead</th></tr></thead><tbody>${D.aiprompts.map((x) => `<tr><td>${esc(x.prompt)}</td><td class="muted">${esc(x.source)}</td><td>${x.checked_at ? (x.cited ? pill('Cited', 'ok') : pill('Not cited', 'warn')) : '<span class="muted">not tested yet</span>'}</td><td class="muted">${esc(x.domains || '')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">The first list is built when the AI citation checker runs (daily at noon, or press Run now under The team).</p>'}</div></div>
    <div class="ag-sec"><h3>Market feed</h3><p class="ag-sub">What the competitor watcher and the research agent found. Headlines only: use them for ideas, never to copy.</p>
      ${groups.length ? groups.map((g) => `<div class="ag-card" style="margin-bottom:14px"><h4>${esc(KIND[g.kind])} <span class="muted">· ${g.rows.length}</span></h4><div class="ag-list">${g.rows.slice(0, 8).map((x) => `<div class="ag-li"><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.title.replace(/^[a-z0-9.-]+\.[a-z]{2,}: /, ''))}</a><div class="s">${esc(x.source)} · ${esc(U.fmtIst(x.seen_at))}</div></div>`).join('')}</div></div>`).join('') : '<div class="ag-card ag-empty">Nothing yet. The competitor watcher runs at 7 AM and 5 PM.</div>'}
      <div class="ag-card"><h4>Competitor websites to watch</h4><p class="muted" style="margin:0 0 10px">Their blogs are read twice a day. Separate with commas.</p><div class="row"><input id="compList" value="${esc((D.competitors || []).join(', '))}"><button class="btn sm" id="compSave">Save</button></div></div></div>
    ${k ? `<div class="ag-sec"><h3>Keyword research</h3><p class="ag-sub">${k.total} keywords found · ${k.gaps} have no page yet · ${k.buy} of those are buying searches. Every other agent works from this list.</p>
      <div class="ag-card"><div class="tw"><table><thead><tr><th>Keyword with no page yet</th><th>Type</th><th>Score</th></tr></thead><tbody>${k.top.slice(0, 15).map((x) => `<tr><td>${esc(x.kw)}</td><td class="muted">${esc(x.intent)}</td><td>${x.score}</td></tr>`).join('')}</tbody></table></div><div class="acts"><button class="btn ghost sm" data-r="keyword_research">Research now</button></div></div></div>` : ''}
    ${(D.team || []).length ? `<div class="ag-sec"><h3>Social posts in progress</h3><p class="ag-sub">Research, graphics, writer, then the final review.</p><div class="ag-card"><div class="tw"><table><thead><tr><th>Post</th><th>Stage</th></tr></thead><tbody>${D.team.slice(0, 10).map((x) => `<tr><td>${esc(x.title)}</td><td>${pill(x.stage, x.stage === 'approved' ? 'ok' : x.stage === 'rejected' ? 'bad' : 'info')}</td></tr>`).join('')}</tbody></table></div></div></div>` : ''}`;
  }

  function vSources() {
    const s = D.setup || {};
    const row = (ok, name, text) => `<div class="ag-src"><div>${pill(ok ? 'Connected' : 'Not connected', ok ? 'ok' : 'warn')}</div><div><b>${name}</b><p>${text}</p></div></div>`;
    return `<div class="ag-sec"><h3>Data sources</h3><p class="ag-sub">The agents run without these, but each one makes the research sharper. All are read-only. Add secrets in Cloudflare (Workers and Pages, your site, Settings, Variables and Secrets), then redeploy.</p>
      <div class="ag-card">
      ${row(s.gsc, 'Google Search Console', s.gsc ? 'Reading your searches, clicks and positions.' : 'Add the secret <code>GOOGLE_SA_JSON</code> (a Google service account key). Then add that account\'s email as a user in Search Console. Optional: <code>GSC_SITE</code> if your property is a URL-prefix one.')}
      ${row(s.ga4, 'Google Analytics 4', s.ga4 ? 'Reading traffic by channel.' : 'Add <code>GA4_PROPERTY_ID</code> (the number from Admin, Property details) and give the same service account Viewer access.')}
      ${row(s.bing, 'Bing Webmaster', s.bing ? 'Reading Bing searches.' : 'Add the secret <code>BING_WEBMASTER_KEY</code> (Bing Webmaster Tools, Settings, API access).')}
      ${row(s.keywordPlanner, 'Google Keyword Planner volumes', s.keywordPlanner ? 'Volumes imported. Upload a fresh file about once a month.' : 'In Google Ads open Tools, Keyword Planner, enter your product keywords, download the CSV, and paste it below. The Google Ads API is not connected.')}
      </div></div>
    <div class="ag-sec"><h3>Import Keyword Planner volumes</h3><p class="ag-sub">Paste the whole CSV. The topic planner then picks the highest-volume keywords (lower competition wins a tie).</p>
      <div class="ag-card"><textarea id="kwCsv" placeholder="Keyword,Currency,Avg. monthly searches,Competition ..."></textarea><div class="acts"><button class="btn" id="kwImp">Import volumes</button></div></div></div>`;
  }

  const LV = { alert: ['Needs you', 'bad'], warn: ['Check', 'warn'], action: ['Done', 'ok'], report: ['Report', 'info'], info: ['Info', ''] };
  let filt = 'all';
  function vActivity() {
    const f = { all: () => true, attention: (l) => ['alert', 'warn'].includes(l.level), done: (l) => l.level === 'action', reports: (l) => ['report', 'info'].includes(l.level) }[filt];
    const rows = D.log.filter((l) => l.level !== 'report' || filt === 'reports').filter(f).slice(0, 40);
    return `<div class="ag-sec"><h3>Activity</h3><p class="ag-sub">Everything the agents did, newest first, in India time.</p>
      <div class="ag-chips">${[['all', 'Everything'], ['attention', 'Needs attention'], ['done', 'Done'], ['reports', 'Reports and info']].map(([k, t]) => `<button data-f="${k}" class="${filt === k ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="ag-card">${rows.length ? rows.map((l) => { const [t, c] = LV[l.level] || ['Info', '']; return `<div class="ag-item"><div class="h">${pill(t, c)}<span class="t">${esc(l.title)}</span><span class="m">${esc(nameOf(l.skill))} · ${esc(U.fmtIst(l.at))}</span></div>${l.detail ? `<pre>${esc(l.detail.length > 700 ? l.detail.slice(0, 700) + '…' : l.detail)}</pre>` : ''}</div>`; }).join('') : '<div class="ag-empty">Nothing here yet.</div>'}</div>
      <div class="acts"><button class="btn ghost sm" id="aClr">Clear old info</button></div></div>`;
  }

  const VIEWS = [['overview', 'Overview', vOverview], ['guide', 'How it works', vGuide], ['team', 'The team', vTeam], ['content', 'Content and research', vContent], ['sources', 'Data sources', vSources], ['activity', 'Activity', vActivity]];
  function draw() {
    const el = $('#t-agent');
    if (!document.getElementById('agCss')) { const st = document.createElement('style'); st.id = 'agCss'; st.textContent = CSS; document.head.appendChild(st); }
    if (!VIEWS.some((v) => v[0] === view)) view = 'overview';
    el.innerHTML = `<div class="ag">
      <div class="ag-top"><div><h2>Agent team</h2><p>Your automatic marketing team. It researches the market, plans topics, writes, designs, checks and publishes, every day, and shows you exactly what it did.</p></div><button class="btn" id="aRun">Run everything now</button></div>
      <div class="ag-nav">${VIEWS.map(([k, t]) => `<button data-v="${k}" class="${view === k ? 'on' : ''}">${t}</button>`).join('')}</div>
      ${VIEWS.find((v) => v[0] === view)[2]()}</div>`;
    const go = async (b, msg) => { try { const r = await post(b); if (msg) toast(msg(r)); loadAgent(); } catch (e) { toast(e.message); } };
    el.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => { view = b.dataset.v; try { localStorage.setItem('wc_agent_view', view); } catch {} draw(); window.scrollTo(0, 0); }));
    el.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { filt = b.dataset.f; draw(); }));
    el.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => { openCard[b.dataset.open] = !openCard[b.dataset.open]; draw(); }));
    $('#aRun').onclick = (e) => { e.target.disabled = true; e.target.textContent = 'Running…'; go({ action: 'run' }, (r) => (r.note ? 'Already running, try again in a minute' : 'Ran ' + (r.ran || []).length + ' agent(s)' + (r.left ? '. ' + r.left + ' more are waiting: press again' : ''))); };
    el.querySelectorAll('[data-sk]').forEach((c) => (c.onchange = () => go({ action: 'toggle', skill: c.dataset.sk, enabled: c.checked })));
    el.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { b.disabled = true; b.textContent = 'Running…'; go({ action: 'run', skill: b.dataset.r }, (r) => (r.ran && r.ran[0] ? (r.ran[0].error ? 'Failed: ' + r.ran[0].error : r.ran[0].summary) : 'Done')); }));
    if ($('#aBlog')) $('#aBlog').onchange = (e) => go({ action: 'autoblog', enabled: e.target.checked });
    if ($('#aClr')) $('#aClr').onclick = () => go({ action: 'clear' }, () => 'Cleared');
    if ($('#kwImp')) $('#kwImp').onclick = () => { const csv = $('#kwCsv').value; if (!csv.trim()) return toast('Paste the CSV first'); go({ action: 'kwimport', csv }, (r) => (r.imported ? 'Imported ' + r.imported + ' keywords' : 'No rows found. Check it is a Keyword Planner export with Keyword and Avg. monthly searches columns.')); };
    if ($('#compSave')) $('#compSave').onclick = () => go({ action: 'competitors', list: $('#compList').value }, () => 'Saved');
  }
  window.loadAgent = async function () {
    const el = $('#t-agent'); if (!D.skills.length) el.innerHTML = '<p class="muted">Loading…</p>';
    try { D = await api('agent'); } catch (e) { el.innerHTML = '<p class="muted">Could not load: ' + esc(e.message) + '</p>'; return; }
    draw();
  };
})();
