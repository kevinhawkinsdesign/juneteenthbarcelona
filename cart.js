(function () {
  const CART_KEY = 'jb_cart';
  const money = (n, c) => (c === 'USD' ? '$' : '€') + Number(n).toFixed(2);
  let CART = [];
  try { CART = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch {}

  function save() { localStorage.setItem(CART_KEY, JSON.stringify(CART)); render(); }

  window.addToCart = function (item, qty) {
    qty = qty || 1;
    const ex = CART.find(c => c.syncVariantId === item.syncVariantId);
    if (ex) ex.qty += qty; else CART.push(Object.assign({ qty }, item));
    save(); openCart();
  };

  function render() {
    const count = document.getElementById('cart-count');
    if (count) count.textContent = CART.reduce((s, c) => s + c.qty, 0);
    const wrap = document.getElementById('cart-items');
    const foot = document.getElementById('cart-foot');
    if (!wrap) return;
    if (!CART.length) { wrap.innerHTML = '<div class="cart-empty">Your cart is empty.</div>'; if (foot) foot.style.display = 'none'; return; }
    if (foot) foot.style.display = 'block';
    wrap.innerHTML = CART.map((c, i) => `<div class="cart-row">
      <img src="${c.image}" alt="">
      <div style="flex:1">
        <div class="ci-name">${c.name}</div>
        <div class="ci-price">${money(c.price, c.currency)}</div>
        <div class="ci-qty"><button data-dec="${i}">−</button><span>${c.qty}</span><button data-inc="${i}">+</button></div>
      </div>
      <button class="ci-remove" data-rm="${i}">Remove</button>
    </div>`).join('');
    document.getElementById('cart-subtotal').textContent = money(CART.reduce((s, c) => s + parseFloat(c.price) * c.qty, 0), CART[0].currency);
    wrap.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => { CART[b.dataset.inc].qty++; save(); });
    wrap.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => { const i = b.dataset.dec; CART[i].qty--; if (CART[i].qty < 1) CART.splice(i, 1); save(); });
    wrap.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { CART.splice(b.dataset.rm, 1); save(); });
  }
  function openCart() { const d = document.getElementById('cart-drawer'), o = document.getElementById('cart-overlay'); if (d) d.classList.add('open'); if (o) o.classList.add('open'); }
  function closeCart() { const d = document.getElementById('cart-drawer'), o = document.getElementById('cart-overlay'); if (d) d.classList.remove('open'); if (o) o.classList.remove('open'); }
  function val(id) { const e = document.getElementById(id); return e ? (e.value || '').trim() : ''; }

  async function checkout() {
    if (!CART.length) return;
    const recipient = {
      name: val('f-name'), email: val('f-email'), address1: val('f-address1'),
      city: val('f-city'), zip: val('f-zip'), state_code: val('f-state'), country_code: val('f-country').toUpperCase()
    };
    if (!recipient.name || !recipient.address1 || !recipient.city || !recipient.zip || !recipient.country_code) {
      alert('Please fill in your name and full shipping address.'); return;
    }
    this.disabled = true; this.textContent = 'Redirecting…';
    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: CART.map(c => ({ syncVariantId: c.syncVariantId, qty: c.qty })), recipient })
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (e) {
      alert('Checkout error: ' + e.message); this.disabled = false; this.textContent = 'Checkout';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const fab = document.getElementById('cart-fab'); if (fab) fab.onclick = openCart;
    const cl = document.getElementById('cart-close'); if (cl) cl.onclick = closeCart;
    const ov = document.getElementById('cart-overlay'); if (ov) ov.onclick = closeCart;
    const co = document.getElementById('cart-checkout'); if (co) co.onclick = checkout;
    render();
  });
})();
