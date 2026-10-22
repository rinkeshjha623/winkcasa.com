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
  // Earliest = order time + 3 days. Latest = 7 days after the order, by 9:00 PM IST.
  function window3to7(from) {
    var min = new Date(from.getTime() + 3 * 864e5), max = new Date(from.getTime() + 7 * 864e5);
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

  window.WC = { cart: load, save: save, count: count, paint: paint, fmtD: fmtD, fmtDT: fmtDT, window3to7: window3to7, etaHtml: etaHtml, toast: toast,
    set: function (id, q) { var c = load(); if (q <= 0) delete c[id]; else c[id] = Math.min(10, q); save(); },
    clear: function () { mem = {}; save(); } };
  paint(); paintEta();
  window.addEventListener('pageshow', paint);
})();
