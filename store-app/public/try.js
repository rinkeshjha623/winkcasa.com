(function () {
  var CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  var MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  var $ = function (i) { return document.getElementById(i); };
  var cv = $('tryCanvas'), ctx = cv.getContext('2d'), res = $('tryRes');
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var lm = null, img = null, products = [], shape = null, layers = { earrings: true, necklace: true, hair: true, beauty: false }, landmarker = null, stream = null, worn = {}, cuts = {}, cutRes = {};

  var SHAPES = {
    oval: { name: 'Oval', note: 'Balanced proportions: almost every style suits you. Statement hoops, layered chains and clips all work.', ear: ['hoop', 'drop', 'stud'], neck: ['layered', 'pendant', 'choker', 'pearl'], hair: ['claw', 'headband', 'clip'] },
    round: { name: 'Round', note: 'Soft, full cheeks. Lengthening drops and V-shaped pendants add vertical line; high clips add height.', ear: ['drop', 'hoop'], neck: ['pendant', 'layered', 'pearl'], hair: ['claw', 'headband', 'clip'] },
    square: { name: 'Square', note: 'Strong jawline. Curved hoops and soft pearls soften angles; round shapes sit beautifully.', ear: ['hoop', 'drop', 'stud'], neck: ['pearl', 'pendant', 'layered'], hair: ['clip', 'headband', 'claw'] },
    heart: { name: 'Heart', note: 'Wider forehead, narrower chin. Pieces that widen towards the bottom, like drops, balance the face.', ear: ['drop', 'hoop', 'stud'], neck: ['choker', 'pearl', 'pendant'], hair: ['clip', 'claw', 'headband'] },
    long: { name: 'Long', note: 'Elegant length. Wide studs and hoops add width; chokers and pearls keep proportions balanced.', ear: ['hoop', 'stud', 'drop'], neck: ['choker', 'pearl', 'layered'], hair: ['clip', 'headband', 'claw'] }
  };
  function kind(p) {
    var n = p.name.toLowerCase();
    if (/earring/.test(n)) return { g: 'ear', t: /hoop|huggie/.test(n) ? 'hoop' : /stud|zircon|needle/.test(n) ? 'stud' : /butterfly|tassel|drop|dangle|bell|pendant/.test(n) ? 'drop' : 'stud' };
    if (/necklace|choker|pendant/.test(n) && !/anklet|bracelet/.test(n)) return { g: 'neck', t: /choker/.test(n) ? 'choker' : /layer|double/.test(n) ? 'layered' : /pearl/.test(n) ? 'pearl' : 'pendant' };
    if (/claw|clip|headband|barrette|hair/.test(n) && p.room === 'Hair & accessories') return { g: 'hair', t: /claw/.test(n) ? 'claw' : /headband/.test(n) ? 'headband' : 'clip' };
    if (/roller|massage|lymph|cleansing|stick/.test(n)) return { g: 'beauty', t: 'tool' };
    return null;
  }
  function pick(g, order, n) {
    var list = products.map(function (p) { var k = kind(p); return k && k.g === g ? { p: p, r: order.indexOf(k.t) } : null; }).filter(function (x) { return x && x.r >= 0 && !x.p.soldOut; });
    list.sort(function (a, b) { return a.r - b.r || a.p.price - b.p.price; });
    var out = [], seen = {};
    list.forEach(function (x) { if (out.length < n && !seen[x.p.id]) { seen[x.p.id] = 1; out.push(x.p); } });
    return out;
  }
  function pickBeauty() { return products.filter(function (p) { var k = kind(p); return k && k.g === 'beauty' && !p.soldOut; }).slice(0, 3); }

  function classify(P) {
    var d = function (a, b) { return Math.hypot(P[a].x - P[b].x, P[a].y - P[b].y); };
    var W = d(234, 454), L = d(10, 152) / W, F = d(54, 284) / W, J = d(172, 397) / W;
    if (L >= 1.42) return 'long'; if (F - J >= 0.16) return 'heart'; if (J >= 0.86 && L < 1.38) return 'square'; if (L < 1.28) return 'round'; return 'oval';
  }


  /* ---------- virtual try-on: cut the product out of its photo ---------- */
  function proxied(u) { return /^\//.test(u) ? u : '/api/cutout?u=' + encodeURIComponent(u); }
  function loadCut(p) {
    if (cuts[p.id]) return cuts[p.id];
    var urls = (p.images && p.images.length ? p.images : [p.image]).slice(0, 6);
    return (cuts[p.id] = new Promise(function (ok) {
      (function next(k) {
        if (k >= urls.length) { cutRes[p.id] = false; ok(null); return; }
        var im = new Image();
        im.onload = function () { var c = null; try { c = makeCut(im); } catch (e) { c = null; } if (c) { cutRes[p.id] = c; ok(c); } else next(k + 1); };
        im.onerror = function () { next(k + 1); }; im.src = proxied(urls[k]);
      })(0);
    }));
  }
  function makeCut(im) {
    var k = Math.min(1, 420 / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.max(2, Math.round(im.naturalWidth * k)), h = Math.max(2, Math.round(im.naturalHeight * k)), n = w * h;
    var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, w, h);
    var d = x.getImageData(0, 0, w, h), px = d.data, i, j, br = 0, bg = 0, bb = 0, bn = 0;
    function edge(f) { for (i = 0; i < w; i++) { f(i); f((h - 1) * w + i); } for (j = 1; j < h - 1; j++) { f(j * w); f(j * w + w - 1); } }
    edge(function (q) { br += px[q * 4]; bg += px[q * 4 + 1]; bb += px[q * 4 + 2]; bn++; });
    br /= bn; bg /= bn; bb /= bn;
    var clear = new Uint8Array(n), lab = new Int32Array(n), qu = new Int32Array(n), cur = 0, a0 = 0, b0 = 0;
    var SEED = 75 * 75, STEP = 13 * 13, HOLE = 40 * 40;
    function near(q) { var dr = px[q * 4] - br, dg = px[q * 4 + 1] - bg, db = px[q * 4 + 2] - bb; return dr * dr + dg * dg + db * db < SEED; }
    function d2(a, b) { var dr = px[a * 4] - px[b * 4], dg = px[a * 4 + 1] - px[b * 4 + 1], db = px[a * 4 + 2] - px[b * 4 + 2]; return dr * dr + dg * dg + db * db; }
    function grow(q, q2) { if (!clear[q2] && d2(q, q2) < STEP && near(q2)) { clear[q2] = 1; qu[b0++] = q2; } }
    edge(function (q) { if (!clear[q] && near(q)) { clear[q] = 1; qu[b0++] = q; } });
    while (a0 < b0) { var q = qu[a0++], qx = q % w, qy = (q - qx) / w;
      if (qx > 0) grow(q, q - 1); if (qx < w - 1) grow(q, q + 1); if (qy > 0) grow(q, q - w); if (qy < h - 1) grow(q, q + w); }
    if (b0 < n * 0.3) return null;                      // background not found: busy or lifestyle photo
    var mr = 0, mg = 0, mb = 0; for (i = 0; i < b0; i++) { mr += px[qu[i] * 4]; mg += px[qu[i] * 4 + 1]; mb += px[qu[i] * 4 + 2]; } mr /= b0; mg /= b0; mb /= b0;
    function flood(seed, match) {
      var a = 0, b = 0, cnt = 0; qu[b++] = seed; lab[seed] = cur;
      while (a < b) { var q = qu[a++], qx = q % w, qy = (q - qx) / w; cnt++;
        if (qx > 0 && !lab[q - 1] && match(q - 1)) { lab[q - 1] = cur; qu[b++] = q - 1; }
        if (qx < w - 1 && !lab[q + 1] && match(q + 1)) { lab[q + 1] = cur; qu[b++] = q + 1; }
        if (qy > 0 && !lab[q - w] && match(q - w)) { lab[q - w] = cur; qu[b++] = q - w; }
        if (qy < h - 1 && !lab[q + w] && match(q + w)) { lab[q + w] = cur; qu[b++] = q + w; } }
      return cnt;
    }
    var holeLike = function (q) { var dr = px[q * 4] - mr, dg = px[q * 4 + 1] - mg, db = px[q * 4 + 2] - mb; return !clear[q] && dr * dr + dg * dg + db * db < HOLE; }, hl = [];
    for (i = 0; i < n; i++) if (!clear[i] && !lab[i] && holeLike(i)) { cur++; var cnt = flood(i, holeLike); hl[cur] = cnt >= n * 0.004; }
    for (i = 0; i < n; i++) if (lab[i] && hl[lab[i]]) clear[i] = 1;
    for (i = 0; i < n; i++) lab[i] = 0; cur = 0; var best = 0, bestId = 0, areas = [];
    for (i = 0; i < n; i++) if (!clear[i] && !lab[i]) { cur++; var ct = flood(i, function (q) { return !clear[q]; }); areas[cur] = ct; if (ct > best) { best = ct; bestId = cur; } }
    if (!bestId || best < n * 0.012 || best > n * 0.8) return null;
    var minX = w, minY = h, maxX = 0, maxY = 0;
    for (i = 0; i < n; i++) { if (lab[i] === bestId) { var ix = i % w, iy = (i - ix) / w; if (ix < minX) minX = ix; if (ix > maxX) maxX = ix; if (iy < minY) minY = iy; if (iy > maxY) maxY = iy; } else px[i * 4 + 3] = 0; }
    if ((minX <= 1) + (minY <= 1) + (maxX >= w - 2) + (maxY >= h - 2) >= 3) return null;   // fills the frame: likely a lifestyle photo
    x.putImageData(d, 0, 0);
    var cw = maxX - minX + 1, ch = maxY - minY + 1, o = document.createElement('canvas'); o.width = cw; o.height = ch; o.getContext('2d').drawImage(c, minX, minY, cw, ch, 0, 0, cw, ch);
    return o;
  }
  function geom() { var l = pt(234), r = pt(454); return { l: l, r: r, W: dist(l, r), roll: Math.atan2(r.y - l.y, r.x - l.x), chin: pt(152), nose: pt(2), top: pt(10), Lh: dist(pt(10), pt(152)) }; }
  function put(c2, cut, cx, cy, w, h, rot, flip, top) {
    c2.save(); c2.translate(cx, cy); c2.rotate(rot); if (flip) c2.scale(-1, 1);
    c2.shadowColor = 'rgba(0,0,0,.38)'; c2.shadowBlur = Math.max(2, w * 0.07); c2.shadowOffsetY = w * 0.03;
    c2.drawImage(cut, -w / 2, top ? 0 : -h / 2, w, h); c2.restore();
  }
  function wear(c2, g, p, cut) {
    var G = geom(), t = (kind(p) || {}).t, a = cut.width / cut.height, w, h;
    if (g === 'ear') {
      h = G.W * (t === 'drop' ? 0.36 : t === 'hoop' ? 0.26 : 0.15); w = h * a; if (w > G.W * 0.3) { w = G.W * 0.3; h = w / a; }
      var y = G.nose.y + (G.chin.y - G.nose.y) * 0.17;
      [[G.l, -1], [G.r, 1]].forEach(function (s) { put(c2, cut, s[0].x + s[1] * G.W * 0.03, t === 'stud' ? y + h * 0.4 : y, w, h, G.roll, s[1] > 0, t !== 'stud'); });
    } else if (g === 'neck') {
      w = G.W * 0.82; h = w / a; if (h > G.W * 0.8) { h = G.W * 0.8; w = h * a; }
      put(c2, cut, G.chin.x, G.chin.y + G.W * (t === 'choker' ? 0.3 : 0.36), w, h, G.roll, false, true);
    } else if (g === 'hair') {
      w = G.W * (t === 'headband' ? 0.95 : t === 'claw' ? 0.38 : 0.24); h = w / a; if (h > G.W * 0.5) { h = G.W * 0.5; w = h * a; }
      var cx = t === 'headband' ? G.top.x : G.top.x + G.W * 0.2, cy = G.top.y - G.Lh * (t === 'headband' ? 0.02 : 0.05);
      if (cy - h / 2 < 0) cy = h / 2;
      put(c2, cut, cx, cy, w, h, G.roll + (t === 'headband' ? 0 : 0.35), false, false);
    }
  }
  function has(g) { return worn[g] && cutRes[worn[g].id]; }
  function setWorn(g, p) { worn[g] = p; loadCut(p).then(function () { draw(); }); }
  function autoWear() {
    worn = {}; var s = SHAPES[shape];
    [['ear', s.ear], ['neck', s.neck], ['hair', s.hair]].forEach(function (a) { var f = pick(a[0], a[1], 1)[0]; if (f) setWorn(a[0], f); });
  }
  function preview(g, p, cut) {
    var o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height; var c = o.getContext('2d'); c.drawImage(img, 0, 0, o.width, o.height); wear(c, g, p, cut);
    var G = geom(), cw, cx, cy;
    if (g === 'ear') { cw = G.W * 0.95; cx = G.l.x; cy = G.nose.y + (G.chin.y - G.nose.y) * 0.32; } else if (g === 'neck') { cw = G.W * 1.5; cx = G.chin.x; cy = G.chin.y + G.W * 0.42; } else { cw = G.W * 1.4; cx = G.top.x; cy = G.top.y + G.Lh * 0.05; }
    var ch = cw * 1.25; if (cw > o.width) { cw = o.width; ch = cw * 1.25; } if (ch > o.height) { ch = o.height; cw = ch / 1.25; }
    var sx = Math.max(0, Math.min(o.width - cw, cx - cw / 2)), sy = Math.max(0, Math.min(o.height - ch, cy - ch / 2));
    var t = document.createElement('canvas'); t.width = 320; t.height = 400; t.getContext('2d').drawImage(o, sx, sy, cw, ch, 0, 0, 320, 400); return t.toDataURL('image/jpeg', 0.85);
  }
  function previews() {
    [].forEach.call(res.querySelectorAll('img[data-pv]'), function (im) {
      var id = im.getAttribute('data-pv'), g = im.getAttribute('data-g'), p = products.filter(function (x) { return String(x.id) === id; })[0];
      if (!p || !lm) return;
      loadCut(p).then(function (cut) { if (!cut || !lm) { im.closest('.tcard').classList.add('nopv'); return; } im.src = preview(g, p, cut); im.classList.add('pv'); im.closest('.tcard').classList.add('onme'); });
    });
  }

  /* ---------- drawing ---------- */
  function pt(i) { return { x: lm[i].x * cv.width, y: lm[i].y * cv.height }; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function halo(fn) { ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(11,25,22,.75)'; ctx.lineWidth = 7; fn(); ctx.strokeStyle = '#E7C77C'; ctx.lineWidth = 3; fn(); ctx.restore(); }
  function label(t, x, y, align) { ctx.save(); ctx.font = '600 15px Hanken Grotesk, system-ui, sans-serif'; ctx.textAlign = align || 'left'; var w = ctx.measureText(t).width + 16, bx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x; ctx.fillStyle = 'rgba(11,25,22,.82)'; ctx.fillRect(bx, y - 16, w, 24); ctx.fillStyle = '#E7C77C'; ctx.textAlign = 'left'; ctx.fillText(t, bx + 8, y + 1); ctx.restore(); }
  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (img) ctx.drawImage(img, 0, 0, cv.width, cv.height);
    if (!lm) return;
    var W = dist(pt(234), pt(454)), Lh = dist(pt(10), pt(152)), chin = pt(152), nose = pt(2);
    var sh = SHAPES[shape];
    if (layers.earrings && !has('ear')) [[234, -1], [454, 1]].forEach(function (s) {
      var e = pt(s[0]), y = nose.y + (chin.y - nose.y) * 0.18, x = e.x + s[1] * W * 0.05, len = shape === 'round' || shape === 'heart' ? W * 0.42 : W * 0.26;
      halo(function () { ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.moveTo(x, y + 7); ctx.lineTo(x, y + len); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y + len + 7, 7, 0, 7); ctx.stroke(); });
      if (s[1] < 0) label('Earrings', x - 14, y - 12, 'right');
    });
    if (layers.necklace && !has('neck')) {
      var l = pt(234), r = pt(454), y0 = chin.y + W * 0.42, ch = shape === 'heart' || shape === 'long' || shape === 'square';
      halo(function () { ctx.beginPath(); ctx.moveTo(l.x + W * 0.12, y0 - W * 0.08); ctx.quadraticCurveTo(chin.x, y0 + W * (ch ? 0.22 : 0.5), r.x - W * 0.12, y0 - W * 0.08); ctx.stroke(); });
      label(ch ? 'Choker / short chain' : 'Pendant, V-line', chin.x, y0 + W * (ch ? 0.38 : 0.68), 'center');
    }
    if (layers.hair && !has('hair')) {
      var top = pt(10), t2 = pt(103), t3 = pt(332);
      halo(function () { ctx.beginPath(); ctx.ellipse(top.x, top.y - Lh * 0.26, W * 0.16, W * 0.075, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.ellipse(t2.x - W * 0.04, t2.y - Lh * 0.06, W * 0.055, W * 0.1, -0.6, 0, 7); ctx.stroke(); });
      label('Claw clip: crown', top.x + W * 0.2, top.y - Lh * 0.3); label('Side clip', t2.x - W * 0.12, t2.y - Lh * 0.1, 'right');
    }
    ['ear', 'neck', 'hair'].forEach(function (g) { if (has(g)) wear(ctx, g, worn[g], cutRes[worn[g].id]); });
    if (layers.beauty) {
      [[152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234], [152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454], [205, 116, 234], [425, 345, 454]].forEach(function (path) {
        halo(function () { ctx.beginPath(); path.forEach(function (i, k) { var p = pt(i); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.stroke(); });
        var a = pt(path[path.length - 2]), b = pt(path[path.length - 1]), ang = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.save(); ctx.fillStyle = '#E7C77C'; ctx.translate(b.x, b.y); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.fill(); ctx.restore();
      });
      label('Roll upward and outward', chin.x, chin.y + W * 0.12, 'center');
    }
  }

  /* ---------- results ---------- */
  function card(p, g) { return '<article class="tcard' + (g && worn[g] && worn[g].id === p.id ? ' on' : '') + '"><a href="' + esc(p.url) + '"><img src="' + esc(p.image) + '" ' + (g ? 'data-pv="' + p.id + '" data-g="' + g + '" ' : '') + 'alt="' + esc(p.name) + '" loading="lazy"></a><h4><a href="' + esc(p.url) + '">' + esc(p.name) + '</a></h4><p class="price">₹' + p.price.toLocaleString('en-IN') + '</p><p class="onbadge">Shown on you</p>' + (g ? '<button class="chip wearb" type="button" data-wear="' + g + ':' + p.id + '">See on me</button>' : '') + '<button class="add" data-add="' + p.id + '">Add to cart</button></article>'; }
  function group(title, why, arr, g) { return arr.length ? '<section class="tgroup"><h3>' + title + '</h3><p class="fine">' + why + '</p><div class="tgrid">' + arr.map(function (p) { return card(p, g); }).join('') + '</div></section>' : ''; }
  function results() {
    var s = SHAPES[shape];
    var chips = Object.keys(SHAPES).map(function (k) { return '<button type="button" class="chip' + (k === shape ? ' on' : '') + '" data-shape="' + k + '">' + SHAPES[k].name + '</button>'; }).join('');
    var lay = [['earrings', 'Earrings'], ['necklace', 'Necklace'], ['hair', 'Hair'], ['beauty', 'Face massage']].map(function (a) { return '<button type="button" class="chip' + (layers[a[0]] ? ' on' : '') + '" data-layer="' + a[0] + '">' + a[1] + '</button>'; }).join('');
    res.innerHTML = '<div class="shapehead"><p class="label">Your face shape</p><h2>' + s.name + '</h2><p>' + s.note + '</p><p class="fine">This is a guide from your photo, not an exact measure. Not quite right? Choose another shape:</p><div class="chips">' + chips + '</div></div>' +
      '<div class="shapehead"><p class="label">Placement guide</p><div class="chips">' + lay + '</div></div>' +
      '<div class="consent" id="consent"><label><input type="checkbox" id="cOk"> I agree that WinkCasa may save this photo for 90 days to improve style suggestions. I can ask for it to be deleted at any time.</label><button type="button" class="btn alt" id="cSave" disabled>Save my photo</button><p class="fine" id="cMsg">Optional. Nothing is saved unless you tick the box and press Save.</p></div>' +
      group('Earrings for you', 'Chosen for a ' + s.name.toLowerCase() + ' face.', pick('ear', s.ear, 3), 'ear') + group('Necklaces for you', 'Lines that flatter your neckline.', pick('neck', s.neck, 3), 'neck') +
      group('Hair accessories', 'Placed to frame your face.', pick('hair', s.hair, 3), 'hair') + group('Facial massage tools', 'Follow the arrows on the guide to roll upward and outward.', pickBeauty());
    var ok = $('cOk'), sv = $('cSave');
    ok.onchange = function () { sv.disabled = !ok.checked; };
    sv.onclick = function () {
      if (!ok.checked || !img) return; var t = document.createElement('canvas'), k = Math.min(1, 480 / Math.max(img.width, img.height)); t.width = Math.round(img.width * k); t.height = Math.round(img.height * k); t.getContext('2d').drawImage(img, 0, 0, t.width, t.height);
      sv.disabled = true; fetch('/api/selfie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent: true, shape: shape, image: t.toDataURL('image/jpeg', 0.7) }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Could not save.'); $('cMsg').textContent = 'Saved. Thank you. To have it deleted, email support@winkcasa.com' + (document.cookie.indexOf('wc_in=1') >= 0 ? ' or delete it from My account.' : '.'); ok.disabled = true; }); })
        .catch(function (e) { $('cMsg').textContent = e.message; sv.disabled = false; });
    };
    [].forEach.call(res.querySelectorAll('[data-shape]'), function (b) { b.onclick = function () { shape = b.getAttribute('data-shape'); autoWear(); draw(); results(); }; });
    [].forEach.call(res.querySelectorAll('[data-wear]'), function (b) { b.onclick = function () { var a = b.getAttribute('data-wear').split(':'), p = products.filter(function (x) { return String(x.id) === a[1]; })[0]; if (p) { setWorn(a[0], p); results(); cv.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }; });
    previews();
    [].forEach.call(res.querySelectorAll('[data-layer]'), function (b) { b.onclick = function () { var k = b.getAttribute('data-layer'); layers[k] = !layers[k]; draw(); results(); }; });
  }

  /* ---------- detection ---------- */
  function say(t) { var l = $('tryLoad'); l.hidden = !t; l.textContent = t || ''; }
  async function getLandmarker() {
    if (landmarker) return landmarker;
    var m = await import(CDN + '/vision_bundle.mjs');
    var fs = await m.FilesetResolver.forVisionTasks(CDN + '/wasm');
    landmarker = await m.FaceLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' }, runningMode: 'IMAGE', numFaces: 1 });
    return landmarker;
  }
  function fit(source, w, h) {
    var max = 900, k = Math.min(1, max / Math.max(w, h)); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    var off = document.createElement('canvas'); off.width = cv.width; off.height = cv.height; off.getContext('2d').drawImage(source, 0, 0, cv.width, cv.height); return off;
  }
  async function analyse(source, w, h) {
    $('tryEmpty').hidden = true; lm = null; res.innerHTML = '<p class="empty">Analysing…</p>'; say('Reading your face… the first time can take a few seconds.');
    try {
      var off = fit(source, w, h); img = off; draw();
      var L = await getLandmarker(), r = L.detect(off);
      if (!r.faceLandmarks || !r.faceLandmarks.length) { say(''); res.innerHTML = '<p class="msg">We could not find a face. Try a bright, front-facing photo with your whole face in view.</p>'; return; }
      lm = r.faceLandmarks[0]; shape = classify(lm); say(''); autoWear(); draw(); results(); res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) { say(''); res.innerHTML = '<p class="msg">Face detection could not start on this device or connection. Please check your internet and try again.</p>'; }
  }
  function fromFile(f) {
    if (!f) return; var u = URL.createObjectURL(f), im = new Image();
    im.onload = function () { analyse(im, im.naturalWidth, im.naturalHeight); URL.revokeObjectURL(u); };
    im.onerror = function () { res.innerHTML = '<p class="msg">That file could not be opened as a photo.</p>'; }; im.src = u;
  }
  $('fSelfie').onchange = function (e) { fromFile(e.target.files[0]); }; $('fUpload').onchange = function (e) { fromFile(e.target.files[0]); };
  var vid = $('tryVideo');
  $('bCam').onclick = function () {
    if (!navigator.mediaDevices) { res.innerHTML = '<p class="msg">Webcam is not available here. Please use Take a selfie or Upload a photo.</p>'; return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 960 } }).then(function (s) { stream = s; vid.srcObject = s; vid.hidden = false; vid.play(); $('tryBox').hidden = true; $('bSnap').hidden = false; $('bCam').hidden = true; }).catch(function () { res.innerHTML = '<p class="msg">Camera permission was not given. You can still upload a photo.</p>'; });
  };
  $('bSnap').onclick = function () {
    var w = vid.videoWidth, h = vid.videoHeight; var t = document.createElement('canvas'); t.width = w; t.height = h; var c = t.getContext('2d'); c.translate(w, 0); c.scale(-1, 1); c.drawImage(vid, 0, 0);
    if (stream) stream.getTracks().forEach(function (x) { x.stop(); }); vid.hidden = true; $('tryBox').hidden = false; $('bSnap').hidden = true; $('bCam').hidden = false; analyse(t, w, h);
  };
  fetch('/api/catalog').then(function (r) { return r.json(); }).then(function (d) { products = d.products || []; }).catch(function () {});
})();
