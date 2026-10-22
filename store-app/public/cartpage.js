(function () {
  var root = document.getElementById('cartRoot'); if (!root) return;
  var COUP = null, CODE = '', CERR = '', P = {}, CFG = { freeShippingAbove: 999, shipping: 79 }, CLOSED = false, busy = false, S = null;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var rupee = function (n) { return '₹' + Number(n).toLocaleString('en-IN'); };

  function lines() {
    var c = WC.cart(), out = [];
    Object.keys(c).forEach(function (id) { var p = P[id]; if (!p || p.soldOut) { WC.set(id, 0); return; } out.push({ p: p, q: c[id] }); });
    return out;
  }
  function totals(ls) {
    var sub = ls.reduce(function (a, l) { return a + l.p.price * l.q; }, 0);
    var ship = sub === 0 ? 0 : (sub >= CFG.freeShippingAbove ? 0 : CFG.shipping);
    var disc = COUP && COUP.discount ? COUP.discount / 100 : 0, soff = COUP && COUP.shippingOff ? COUP.shippingOff / 100 : 0;
    ship = Math.max(0, ship - soff);
    return { sub: sub, ship: ship, disc: disc, total: Math.max(1, sub - disc + ship) };
  }

  function couponBox() {
    if (COUP && COUP.code && !COUP.auto) return '<div class="cpn on"><span>🏷 <b>' + esc(COUP.code) + '</b> · ' + esc(COUP.label) + ' applied</span><button type="button" id="cpRm">Remove</button></div>';
    var auto = COUP && COUP.auto ? '<div class="cpn on" style="margin-bottom:8px"><span>🏷 Offer applied: <b>' + esc(COUP.label) + '</b></span></div>' : '';
    return auto + '<div class="cpn"><div class="cprow"><input id="cpIn" placeholder="Discount code" autocapitalize="characters" autocomplete="off" value="' + esc(CODE) + '"><button type="button" id="cpGo">Apply</button></div>' + (CERR ? '<div class="cperr">' + esc(CERR) + '</div>' : '') + '</div>';
  }
  async function refreshCoupon(code, manual) {
    if (code !== undefined) CODE = code;
    var items = lines().map(function (l) { return { id: l.p.id, qty: l.q }; });
    if (!items.length) { COUP = null; return; }
    var f = $('co'), email = f && f.elements.email ? f.elements.email.value : '';
    try {
      var r = await post('/api/coupon', { items: items, code: CODE, email: email });
      CERR = ''; COUP = r.none ? null : r;
    } catch (e) {
      if (manual) { CERR = e.message; }
      if (CODE) { CODE = ''; try { var r2 = await post('/api/coupon', { items: items, code: '', email: email }); COUP = r2.none ? null : r2; } catch (x) { COUP = null; } } else COUP = null;
    }
    keepForm(); render();
  }
  function render() {
    var ls = lines(), t = totals(ls);
    if (!ls.length) {
      root.innerHTML = '<div class="emptycart"><h2 style="font-family:var(--display);font-weight:500;font-size:1.8rem;color:var(--fg)">Your cart is empty</h2><p>Add something you like and it will wait for you here.</p><a class="btn" href="/#shop">Continue shopping</a></div>';
      return;
    }
    root.innerHTML =
      '<div class="cartgrid"><div id="items">' + ls.map(function (l) {
        var p = l.p, img = p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" width="84" height="104">' : '<div class="ph"></div>';
        return '<div class="cline">' + img + '<div><h3><a href="' + esc(p.url) + '">' + esc(p.name) + '</a></h3><div class="dim" style="color:var(--muted);font-size:.85rem">' + esc(p.dim) + '</div>' +
          '<div class="qtyc"><button data-dec="' + p.id + '" aria-label="Fewer">−</button><span>' + l.q + '</span><button data-inc="' + p.id + '" aria-label="More">+</button><button class="rm" data-rm="' + p.id + '">Remove</button></div></div>' +
          '<div class="price" style="color:var(--accent)">' + rupee(p.price * l.q) + '</div></div>';
      }).join('') + '<p style="margin-top:18px"><a href="/#shop" style="color:var(--muted)">← Continue shopping</a></p></div>' +
      '<aside class="summary"><h2>Order summary</h2>' +
      '<div class="srow"><span>Subtotal</span><span>' + rupee(t.sub) + '</span></div>' +
      (t.disc ? '<div class="srow disc"><span>Discount' + (COUP.code ? ' (' + esc(COUP.code) + ')' : '') + '</span><span>−' + rupee(t.disc) + '</span></div>' : '') +
      '<div class="srow"><span>Delivery</span><span>' + (t.ship ? rupee(t.ship) : 'Free') + '</span></div>' +
      (t.ship ? '<div class="srow" style="font-size:.8rem">Add ' + rupee(CFG.freeShippingAbove - t.sub) + ' more for free delivery</div>' : '') +
      couponBox() +
      '<div class="srow t"><span>Total</span><span>' + rupee(t.total) + '</span></div>' +
      '<div class="paym" aria-label="Payment options"><span class="pm">UPI</span><span class="pm">Credit &amp; debit cards</span><span class="pm">Net banking</span></div>' +
      '<form class="form" id="co" novalidate><h2 style="margin-top:14px">Delivery details</h2>' +
      '<label for="f_name">Full name</label><input id="f_name" name="name" autocomplete="name" required>' +
      '<div class="two"><div><label for="f_phone">Mobile number</label><input id="f_phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" required></div>' +
      '<div><label for="f_email">Email</label><input id="f_email" name="email" type="email" autocomplete="email" required></div></div>' +
      '<label for="f_address">Delivery address</label><textarea id="f_address" name="address" rows="3" autocomplete="street-address" required></textarea>' +
      '<div class="two"><div><label for="f_city">City</label><input id="f_city" name="city" autocomplete="address-level2" required></div>' +
      '<div><label for="f_pincode">Pincode</label><input id="f_pincode" name="pincode" inputmode="numeric" maxlength="6" autocomplete="postal-code" required></div></div>' +
      '<label for="f_state">State</label><input id="f_state" name="state" autocomplete="address-level1" required>' +
      '<button class="btn full" id="pay" type="submit"' + (CLOSED ? ' disabled' : '') + '>' + (CLOSED ? 'Store closed' : 'Pay ' + rupee(t.total) + ' securely') + '</button>' +
      '<p class="msg" id="msg" role="status">' + (CLOSED ? esc(S.store.closedMessage) : '') + '</p>' +
      '<p style="font-size:.78rem;color:var(--muted);margin:8px 0 0">Pay by UPI, card or net banking on the next screen. By paying you agree to our <a href="/terms">Terms</a> and <a href="/returns">Returns policy</a>.</p></form></aside></div>';
    WC.paint(); var e = root.querySelector('[data-eta]'); if (e) e.innerHTML = WC.etaHtml(new Date());
    $('co').onsubmit = function (ev) { ev.preventDefault(); pay(); };
    if ($('cpGo')) { $('cpGo').onclick = function () { var v = $('cpIn').value.trim(); if (v) refreshCoupon(v.toUpperCase(), true); }; $('cpIn').onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); $('cpGo').click(); } }; }
    if ($('cpRm')) $('cpRm').onclick = function () { CERR = ''; refreshCoupon('', false); };
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var c = WC.cart();
    if (b.dataset.inc) WC.set(b.dataset.inc, (c[b.dataset.inc] || 0) + 1);
    else if (b.dataset.dec) WC.set(b.dataset.dec, (c[b.dataset.dec] || 0) - 1);
    else if (b.dataset.rm) WC.set(b.dataset.rm, 0);
    else return;
    keepForm(); render(); refreshCoupon();
  });
  var saved = {};
  function keepForm() { var f = $('co'); if (!f) return; ['name', 'phone', 'email', 'address', 'city', 'pincode', 'state'].forEach(function (k) { saved[k] = f.elements[k].value; }); }
  var origRender = render; render = function () { origRender(); var f = $('co'); if (f) Object.keys(saved).forEach(function (k) { f.elements[k].value = saved[k]; }); };


  // Logged-in customers: fill the form from their default saved address.
  if (/(?:^|;\s*)wc_in=1/.test(document.cookie)) fetch('/api/account', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
    if (!d.customer) return; var a = (d.addresses || [])[0] || {}, c = d.customer, f = $('co');
    var pre = { name: a.name || c.name, phone: a.phone || c.phone || '', email: c.email, address: a.address || '', city: a.city || '', pincode: a.pincode || '', state: a.state || '' };
    Object.keys(pre).forEach(function (k) { if (!saved[k]) saved[k] = pre[k] || ''; if (f && f.elements[k] && !f.elements[k].value) f.elements[k].value = pre[k] || ''; });
  }).catch(function () {});

  function say(t, cls) { var m = $('msg'); if (m) { m.textContent = t; m.className = 'msg ' + (cls || ''); } }
  function setBusy(v) { busy = v; var b = $('pay'); if (b) { b.disabled = v || CLOSED; b.textContent = v ? 'Please wait…' : 'Pay ' + rupee(totals(lines()).total) + ' securely'; } }
  async function post(url, data) {
    var r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    var d = {}; try { d = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(d.error || 'Something went wrong. Please try again.');
    return d;
  }
  function parseUtc(s) { return new Date(String(s).replace(' ', 'T') + 'Z'); }

  async function pay() {
    if (busy || CLOSED) return;
    var f = $('co'); if (!f.reportValidity()) return;
    try { gtag('event', 'begin_checkout', { currency: 'INR' }); } catch (x) {}
    var customer = {}; ['name', 'phone', 'email', 'address', 'city', 'pincode', 'state'].forEach(function (k) { customer[k] = f.elements[k].value; });
    var items = lines().map(function (l) { return { id: l.p.id, qty: l.q }; });
    setBusy(true); say('Creating your order…');
    try {
      var d = await post('/api/checkout', { items: items, customer: customer, coupon: CODE });
      if (!window.Razorpay) throw new Error('The payment window did not load. Check your connection and try again.');
      var rz = new Razorpay({ key: d.keyId, amount: d.amount, currency: 'INR', name: 'WinkCasa', description: 'Order ' + d.orderRef, order_id: d.razorpayOrderId,
        prefill: { name: customer.name, email: customer.email, contact: customer.phone }, theme: { color: '#C9A45C' },
        handler: async function (resp) {
          say('Confirming your payment…');
          try { var v = await post('/api/verify', resp); done(v.orderRef || d.orderRef, d, customer); }
          catch (e) { say('Payment received, but we could not confirm it on screen. Your order ' + d.orderRef + ' is safe. Save this number and contact us if you do not hear from us.', 'err'); setBusy(false); }
        },
        modal: { ondismiss: function () { say('Payment cancelled. Your cart is saved.'); setBusy(false); } } });
      rz.on('payment.failed', function (e) { say((e.error && e.error.description) || 'Payment failed. Please try again.', 'err'); setBusy(false); });
      rz.open();
    } catch (e) { say(e.message, 'err'); setBusy(false); }
  }

  function done(ref, d, c) {
    var placed = parseUtc(d.placedAt), mn = parseUtc(d.deliveryMinAt), mx = parseUtc(d.deliveryMaxAt);
    try { gtag('event', 'purchase', { transaction_id: ref, value: d.amount / 100, currency: 'INR' }); } catch (x) {}
    WC.clear();
    document.title = 'Order confirmed | WinkCasa';
    root.innerHTML = '<div class="done"><h1>Thank you, your order is confirmed</h1><p style="color:var(--muted)">We have received your payment. Keep your order number to track delivery.</p>' +
      '<dl><dt>Order number</dt><dd><b>' + esc(ref) + '</b></dd><dt>Order placed</dt><dd>' + esc(WC.fmtDT(placed)) + '</dd>' +
      '<dt>Expected delivery</dt><dd>' + esc(WC.fmtD(mn)) + ' to ' + esc(WC.fmtD(mx)) + ', by 9:00 PM</dd>' +
      '<dt>Amount paid</dt><dd>' + rupee(d.amount / 100) + '</dd><dt>Delivering to</dt><dd>' + esc(c.name) + ', ' + esc(c.address) + ', ' + esc(c.city) + ' ' + esc(c.pincode) + '</dd></dl>' +
      '<a class="btn" href="/track?ref=' + encodeURIComponent(ref) + '">Track your order</a> &nbsp; <a class="btn alt" href="/">Continue shopping</a></div>';
    window.scrollTo(0, 0);
  }

  fetch('/api/catalog').then(function (r) { return r.json(); }).then(function (c) {
    c.products.forEach(function (p) { P[p.id] = p; });
    CFG = c.config; S = c.settings; CLOSED = !S.store.open; render(); refreshCoupon();
  }).catch(function () { root.innerHTML = '<p class="emptycart">We could not load your cart. Please refresh the page.</p>'; });
})();
