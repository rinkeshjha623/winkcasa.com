(function () {
  var root = document.getElementById('acctRoot'), H = document.getElementById('acctH');
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var inr = function (p) { return '₹' + (p / 100).toLocaleString('en-IN'); };
  var utc = function (s) { return new Date(String(s).replace(' ', 'T') + 'Z'); };
  var day = function (s) { return s ? utc(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : ''; };
  var LBL = { new: 'Order received', ordered: 'Being prepared', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned' };
  var D = null, tab = 'orders', mode = 'login', editing = null;
  var next = new URLSearchParams(location.search).get('next');
  var safeNext = next && /^\/[^\/\\]/.test(next) ? next : '';

  function api(body) {
    return fetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Something went wrong.'); return j; }); });
  }
  function msg(id, text, ok) { var e = document.getElementById(id); if (e) { e.textContent = text; e.className = 'msg' + (ok ? ' ok' : ''); } }
  function hint(on) { try { window.__wcIn = on; } catch (e) {} }

  function authView() {
    H.textContent = mode === 'login' ? 'Log in' : 'Create your account';
    var signup = mode === 'signup';
    root.innerHTML = '<div class="authbox"><div class="seg"><button type="button" data-m="login" class="' + (!signup ? 'on' : '') + '">Log in</button><button type="button" data-m="signup" class="' + (signup ? 'on' : '') + '">Sign up</button></div>' +
      '<form class="form" id="af" novalidate>' +
      (signup ? '<label for="a_name">Full name</label><input id="a_name" name="name" autocomplete="name" required maxlength="80">' : '') +
      '<label for="a_email">Email</label><input id="a_email" name="email" type="email" autocomplete="email" required maxlength="120">' +
      (signup ? '<label for="a_phone">Mobile number <span class="opt">(optional)</span></label><input id="a_phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="15">' : '') +
      '<label for="a_pw">Password' + (signup ? ' <span class="opt">(at least 8 characters)</span>' : '') + '</label><input id="a_pw" name="password" type="password" autocomplete="' + (signup ? 'new-password' : 'current-password') + '" required maxlength="100">' +
      '<input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">' +
      '<button class="btn full" type="submit">' + (signup ? 'Create account' : 'Log in') + '</button><p class="msg" id="amsg" role="status"></p></form>' +
      '<p class="fine">' + (signup ? 'Already have an account? <a href="#" data-m="login">Log in</a>.' : 'New to WinkCasa? <a href="#" data-m="signup">Create an account</a>.') +
      ' Forgotten your password? Write to <a href="/contact">Contact us</a> and we will help you get back in.</p>' +
      '<p class="fine">You can still check out without an account. <a href="/track">Track an order</a> with your order number.</p></div>';
    [].forEach.call(root.querySelectorAll('[data-m]'), function (b) { b.onclick = function (e) { e.preventDefault(); mode = b.getAttribute('data-m'); authView(); }; });
    var f = document.getElementById('af');
    f.onsubmit = function (e) {
      e.preventDefault(); msg('amsg', signup ? 'Creating your account…' : 'Logging in…');
      var body = { action: mode }; ['name', 'email', 'phone', 'password', 'website'].forEach(function (k) { if (f.elements[k]) body[k] = f.elements[k].value; });
      api(body).then(function (d) { D = d; hint(true); if (safeNext) { location.href = safeNext; return; } view(); }).catch(function (er) { msg('amsg', er.message); });
    };
  }

  function statusOf(o) { return o.paid ? (LBL[o.status] || o.status) : 'Awaiting payment'; }
  function ordersTab() {
    if (!D.orders.length) return '<p class="empty">No orders yet. When you place an order while logged in, it shows up here.</p><a class="btn" href="/#shop">Start shopping</a>';
    return D.orders.map(function (o) {
      var eta = o.paid && o.status !== 'delivered' && o.status !== 'cancelled' && o.deliveryMinAt ? '<p class="fine">Expected between ' + day(o.deliveryMinAt) + ' and ' + day(o.deliveryMaxAt) + '</p>' : '';
      return '<article class="ord"><div class="ordh"><div><b>' + esc(o.ref) + '</b><span class="fine"> · placed ' + day(o.placedAt) + '</span></div><span class="pill s-' + esc(o.paid ? o.status : 'pending') + '">' + esc(statusOf(o)) + '</span></div>' +
        '<ul>' + o.items.map(function (i) { return '<li>' + esc(i.name) + ' × ' + i.qty + '</li>'; }).join('') + '</ul>' + eta +
        '<div class="ordf"><b>' + inr(o.total) + '</b><a class="lnk" href="/track?ref=' + encodeURIComponent(o.ref) + '">Track order</a>' + (o.tracking ? '<span class="fine">' + esc(o.courier || 'Courier') + ' · ' + esc(o.tracking) + '</span>' : '') + '</div></article>';
    }).join('');
  }
  function wishTab() {
    if (!D.wishlist.length) return '<p class="empty">Your wishlist is empty. Tap the heart on any product to save it here.</p><a class="btn" href="/#shop">Browse products</a>';
    return '<div class="wgrid">' + D.wishlist.map(function (p) {
      return '<article class="wcard"><a href="' + esc(p.url) + '">' + (p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' : '') + '</a><h3><a href="' + esc(p.url) + '">' + esc(p.name) + '</a></h3><p class="price">₹' + p.price.toLocaleString('en-IN') + '</p>' +
        '<div class="cardbtns"><button class="add" data-add="' + p.id + '">Add to cart</button><button class="buy" data-unwish="' + p.id + '">Remove</button></div></article>';
    }).join('') + '</div>';
  }
  function addrForm(a) {
    a = a || {};
    var v = function (k) { return esc(a[k] || ''); };
    return '<form class="form" id="adf" novalidate><input type="hidden" name="id" value="' + (a.id || '') + '">' +
      '<label>Label <span class="opt">(Home, Work…)</span></label><input name="label" maxlength="30" value="' + v('label') + '">' +
      '<label>Full name</label><input name="name" required maxlength="80" value="' + v('name') + '">' +
      '<label>Mobile number</label><input name="phone" type="tel" inputmode="numeric" required maxlength="15" value="' + v('phone') + '">' +
      '<label>Address</label><textarea name="address" rows="3" required maxlength="300">' + v('address') + '</textarea>' +
      '<div class="two"><div><label>City</label><input name="city" required maxlength="60" value="' + v('city') + '"></div><div><label>Pincode</label><input name="pincode" inputmode="numeric" maxlength="6" required value="' + v('pincode') + '"></div></div>' +
      '<label>State</label><input name="state" required maxlength="60" value="' + v('state') + '">' +
      '<div class="rowbtns"><button class="btn" type="submit">Save address</button><button class="btn ghost" type="button" id="adx">Cancel</button></div><p class="msg" id="admsg" role="status"></p></form>';
  }
  function addrTab() {
    if (editing) return addrForm(editing === 'new' ? {} : D.addresses.filter(function (a) { return a.id === editing; })[0]);
    return (D.addresses.length ? '<div class="agrid">' + D.addresses.map(function (a) {
      return '<article class="acard">' + (a.is_default ? '<span class="pill">Default</span>' : '') + '<b>' + esc(a.label || 'Address') + '</b><p>' + esc(a.name) + '<br>' + esc(a.address) + '<br>' + esc(a.city) + ', ' + esc(a.state) + ' ' + esc(a.pincode) + '<br>' + esc(a.phone) + '</p>' +
        '<div class="rowbtns"><button class="lnk" data-edit="' + a.id + '">Edit</button>' + (a.is_default ? '' : '<button class="lnk" data-def="' + a.id + '">Make default</button>') + '<button class="lnk" data-del="' + a.id + '">Delete</button></div></article>';
    }).join('') + '</div>' : '<p class="empty">No saved addresses yet. Save one and we will fill it in at checkout.</p>') + '<button class="btn" id="adnew">Add an address</button>';
  }
  function profileTab() {
    var c = D.customer;
    return '<div class="twocol"><form class="form" id="pf" novalidate><h3>Your details</h3><label>Email</label><input value="' + esc(c.email) + '" disabled>' +
      '<label>Full name</label><input name="name" required maxlength="80" value="' + esc(c.name) + '"><label>Mobile number</label><input name="phone" type="tel" inputmode="numeric" maxlength="15" value="' + esc(c.phone || '') + '">' +
      '<button class="btn" type="submit">Save details</button><p class="msg" id="pmsg" role="status"></p></form>' +
      '<form class="form" id="pwf" novalidate><h3>Change password</h3><label>Current password</label><input name="current" type="password" autocomplete="current-password" required><label>New password <span class="opt">(at least 8 characters)</span></label><input name="password" type="password" autocomplete="new-password" required>' +
      '<button class="btn" type="submit">Change password</button><p class="msg" id="pwmsg" role="status"></p></form></div>' +
      '<details class="danger"><summary>Delete my account</summary><p class="fine">This removes your login, saved addresses and wishlist. Past orders are kept for our records, as the law requires, but are no longer linked to you.</p><form class="form" id="delf" novalidate><label>Confirm with your password</label><input name="password" type="password" autocomplete="current-password" required><button class="btn ghost" type="submit">Delete account</button><p class="msg" id="dmsg"></p></form></details>';
  }

  function view() {
    if (!D || !D.customer) { authView(); return; }
    H.textContent = 'Hello, ' + D.customer.name.split(' ')[0];
    var tabs = [['orders', 'Orders'], ['wish', 'Wishlist (' + D.wishlist.length + ')'], ['addr', 'Addresses'], ['profile', 'Profile']];
    root.innerHTML = '<div class="acctbar"><nav class="seg">' + tabs.map(function (t) { return '<button type="button" data-t="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</nav><button class="lnk" id="lo">Log out</button></div>' +
      '<section class="tabbody">' + (tab === 'orders' ? ordersTab() : tab === 'wish' ? wishTab() : tab === 'addr' ? addrTab() : profileTab()) + '</section>';
    bind();
  }
  function set(d) { D = d; view(); }
  function bind() {
    [].forEach.call(root.querySelectorAll('[data-t]'), function (b) { b.onclick = function () { tab = b.getAttribute('data-t'); editing = null; view(); }; });
    document.getElementById('lo').onclick = function () { api({ action: 'logout' }).then(function () { D = null; hint(false); mode = 'login'; view(); }); };
    var q = function (s, fn) { [].forEach.call(root.querySelectorAll(s), fn); };
    q('[data-unwish]', function (b) { b.onclick = function () { api({ action: 'wish', id: +b.getAttribute('data-unwish') }).then(set); }; });
    q('[data-edit]', function (b) { b.onclick = function () { editing = +b.getAttribute('data-edit'); view(); }; });
    q('[data-def]', function (b) { b.onclick = function () { api({ action: 'address_default', id: +b.getAttribute('data-def') }).then(set); }; });
    q('[data-del]', function (b) { b.onclick = function () { if (confirm('Delete this address?')) api({ action: 'address_delete', id: +b.getAttribute('data-del') }).then(set); }; });
    var an = document.getElementById('adnew'); if (an) an.onclick = function () { editing = 'new'; view(); };
    var ax = document.getElementById('adx'); if (ax) ax.onclick = function () { editing = null; view(); };
    var af = document.getElementById('adf');
    if (af) af.onsubmit = function (e) { e.preventDefault(); var a = {}; ['id', 'label', 'name', 'phone', 'address', 'city', 'state', 'pincode'].forEach(function (k) { a[k] = af.elements[k].value; });
      api({ action: 'address_save', address: a }).then(function (d) { editing = null; set(d); }).catch(function (er) { msg('admsg', er.message); }); };
    var pf = document.getElementById('pf');
    if (pf) pf.onsubmit = function (e) { e.preventDefault(); api({ action: 'profile', name: pf.name.value, phone: pf.phone.value }).then(function (d) { D = d; H.textContent = 'Hello, ' + d.customer.name.split(' ')[0]; msg('pmsg', 'Saved.', true); }).catch(function (er) { msg('pmsg', er.message); }); };
    var pw = document.getElementById('pwf');
    if (pw) pw.onsubmit = function (e) { e.preventDefault(); api({ action: 'password', current: pw.current.value, password: pw.password.value }).then(function () { D = null; hint(false); mode = 'login'; authView(); msg('amsg', 'Password changed. Please log in again.', true); }).catch(function (er) { msg('pwmsg', er.message); }); };
    var df = document.getElementById('delf');
    if (df) df.onsubmit = function (e) { e.preventDefault(); if (!confirm('Delete your account for good?')) return; api({ action: 'delete_account', password: df.password.value }).then(function () { D = null; hint(false); mode = 'signup'; authView(); }).catch(function (er) { msg('dmsg', er.message); }); };
  }

  if (new URLSearchParams(location.search).get('mode') === 'signup') mode = 'signup';
  fetch('/api/account', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) { D = d.customer ? d : null; if (D && safeNext) { location.href = safeNext; return; } view(); }).catch(function () { authView(); });
})();
