/* WinkCasa shared storefront script: cart (saved in the browser), Add to cart / Buy now, delivery estimates. */
(function () {
  var KEY = 'wc_cart_v1', mem = null;
  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { mem = {}; }
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} paint(); }
  function count() { var c = load(), n = 0; for (var k in c) n += c[k]; return n; }
  function paint() { var n = count(); [].forEach.call(document.querySelectorAll('[data-cartcount]'), function (e) { e.textContent = n; }); }

  var TZ = 'Asia/Kolkata';
  function fmtD(d) { return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }); }
  function fmtDT(d) { return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ }) + ' IST'; }
  // Earliest = order time + 10 days. Latest = 20 days after the order, by 9:00 PM IST.
  function window3to7(from) {
    var min = new Date(from.getTime() + 10 * 864e5), max = new Date(from.getTime() + 20 * 864e5);
    max.setUTCHours(15, 30, 0, 0);
    return { min: min, max: max };
  }
  function etaHtml(from) {
    var w = window3to7(from);
    return '<b>Order today</b> (' + fmtDT(from) + ')<br><b>Expected delivery:</b> ' + fmtD(w.min) + ' to ' + fmtD(w.max) + ', by 9:00 PM';
  }
  function paintEta() { [].forEach.call(document.querySelectorAll('[data-eta]'), function (e) { e.innerHTML = etaHtml(new Date()); }); }

  function toast(msg, link) {
    var t = document.getElementById('wctoast'); if (t) t.remove();
    t = document.createElement('div'); t.id = 'wctoast'; t.setAttribute('role', 'status');
    t.innerHTML = '<span>' + msg + '</span>' + (link ? '<a href="/cart">View cart</a>' : '');
    document.body.appendChild(t); setTimeout(function () { if (t.parentNode) t.remove(); }, 3500);
  }
  function add(id, q) { var c = load(); c[id] = Math.min(10, (c[id] || 0) + (q || 1)); save(); }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-add],[data-buy]'); if (!b) return;
    if (b.disabled) return;
    if (b.hasAttribute('data-buy')) { e.preventDefault(); add(b.getAttribute('data-buy')); location.href = '/cart'; return; }
    add(b.getAttribute('data-add')); toast('Added to your cart.', true);
  });


  // Wishlist hearts: logged-out shoppers are sent to log in; logged-in ones toggle a saved item.
  var wished = {}, loggedIn = /(?:^|;\s*)wc_in=1/.test(document.cookie);
  function paintWish() { [].forEach.call(document.querySelectorAll('[data-wish]'), function (b) { var on = !!wished[b.getAttribute('data-wish')]; b.classList.toggle('on', on); b.textContent = on ? '♥' : '♡'; b.setAttribute('aria-pressed', on); }); }
  if (loggedIn) fetch('/api/account', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) { (d.wishIds || []).forEach(function (i) { wished[i] = 1; }); paintWish(); }).catch(function () {});
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-wish]'); if (!b) return;
    e.preventDefault(); var id = b.getAttribute('data-wish');
    if (!loggedIn) { location.href = '/account?next=' + encodeURIComponent(location.pathname + location.search); return; }
    fetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'wish', id: +id }) })
      .then(function (r) { if (r.status === 401) { loggedIn = false; location.href = '/account'; throw 0; } return r.json(); })
      .then(function (d) { wished = {}; (d.wishIds || []).forEach(function (i) { wished[i] = 1; }); paintWish(); toast(wished[id] ? 'Saved to your wishlist.' : 'Removed from your wishlist.'); }).catch(function () {});
  });
  paintWish();


  // Installable app: register the service worker and offer an "Install app" button where the browser allows it.
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream, dismissed = false;
  try { dismissed = localStorage.getItem('wc_install_no') === '1'; } catch (e) {}
  function installBar(html, onGo) {
    if (standalone || dismissed || document.getElementById('instbar')) return;
    var d = document.createElement('div'); d.id = 'instbar'; d.className = 'instbar';
    d.innerHTML = '<span>' + html + '</span>' + (onGo ? '<button type="button" id="instgo">Install</button>' : '') + '<button type="button" id="instx" aria-label="Dismiss">×</button>';
    document.body.appendChild(d);
    document.getElementById('instx').onclick = function () { d.remove(); try { localStorage.setItem('wc_install_no', '1'); } catch (e) {} };
    if (onGo) document.getElementById('instgo').onclick = function () { d.remove(); onGo(); };
  }
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; setTimeout(function () { installBar('Get the <b>WinkCasa app</b> on your phone', function () { deferred.prompt(); }); }, 8000); });
  if (ios && !standalone) setTimeout(function () { installBar('Install WinkCasa: tap <b>Share</b>, then <b>Add to Home Screen</b>'); }, 8000);

  window.WC = { cart: load, save: save, count: count, paint: paint, fmtD: fmtD, fmtDT: fmtDT, window3to7: window3to7, etaHtml: etaHtml, toast: toast,
    set: function (id, q) { var c = load(); if (q <= 0) delete c[id]; else c[id] = Math.min(10, q); save(); },
    clear: function () { mem = {}; save(); } };
  paint(); paintEta();
  window.addEventListener('pageshow', paint);
})();
