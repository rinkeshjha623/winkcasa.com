/* Small pure helpers for the Agent tab (also loaded by the unit tests). */
(function (root, factory) { const u = factory(); if (typeof module === 'object' && module.exports) module.exports = u; else root.AgentUtil = u; })(typeof self !== 'undefined' ? self : this, function () {
  const hr = (h) => (h % 12 || 12) + (h < 12 ? ' AM' : ' PM');
  const scheduleLabel = (s) => {
    if (s.locked || (!s.slots && !s.everyMin)) return 'Not active';
    if (s.slots) return (s.slots.length > 1 ? 'Twice a day' : 'Daily') + ' · ' + s.slots.map(hr).join(', ');
    if (s.hourIst !== undefined) return 'Daily · ' + hr(s.hourIst);
    const m = s.everyMin;
    if (m >= 1440) return 'Once a day';
    if (m >= 120) return 'Every ' + Math.round(m / 60) + ' hours';
    if (m === 60) return 'Every hour';
    return 'Every ' + m + ' min';
  };
  // The team, in the order work flows.
  const GROUPS = [
    { key: 'research', title: 'Research', blurb: 'Finds out what is happening in the market and what shoppers want.', ids: ['market_watch', 'social_listening', 'insights', 'keyword_research'] },
    { key: 'create', title: 'Plan and create', blurb: 'Turns research into topics, articles, product text and social posts.', ids: ['topic_planner', 'content_writer', 'product_copy', 'social_fill', 'social_research', 'social_writer'] },
    { key: 'publish', title: 'Graphics, final checks and publishing', blurb: 'Makes the pictures, checks everything, and is the only gate to going live.', ids: ['social_visual', 'content_review', 'social_manager'] },
    { key: 'store', title: 'Store operations', blurb: 'Keeps orders, indexing and reports running.', ids: ['cj_orders', 'order_watch', 'seo_health', 'daily_report', 'ads'] },
  ];
  const parseAt = (at) => Date.parse(String(at).replace(' ', 'T') + 'Z');
  const fmtIst = (at) => new Date(parseAt(at)).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
  const firstSentence = (t) => { const s = String(t || '').trim(); const m = /^(.+?[.!?])(\s|$)/.exec(s); const out = m ? m[1] : s; return out.length > 160 ? out.slice(0, 157) + '…' : out; };
  const needsYou = (log, now = Date.now()) => {
    const out = new Map();
    for (const l of [...log].sort((a, b) => b.id - a.id)) {
      if (!['alert', 'warn'].includes(l.level) || now - parseAt(l.at) > 3 * 86400000) continue;
      if (log.some((x) => x.skill === l.skill && x.id > l.id && ['action', 'info', 'report'].includes(x.level))) continue; // fixed by a later good run
      const k = l.skill + '|' + l.title;
      if (out.has(k)) out.get(k).count++; else out.set(k, { ...l, count: 1 });
    }
    return [...out.values()];
  };
  return { scheduleLabel, GROUPS, fmtIst, firstSentence, needsYou, parseAt, hr };
});
