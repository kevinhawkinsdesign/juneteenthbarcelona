const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PF = 'https://api.printful.com';

function pfHeaders(extra) {
  const h = Object.assign({ Authorization: 'Bearer ' + process.env.PRINTFUL_API_KEY }, extra || {});
  if (process.env.PRINTFUL_STORE_ID) h['X-PF-Store-Id'] = process.env.PRINTFUL_STORE_ID;
  return h;
}
function json(status, body) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

// Printful expects a 2-letter ISO country code, a 2–3 letter state/province
// code (US/CA/AU), and a valid email. Anything else is dropped/rejected so
// invalid values never reach Printful.
function sanitizeCountry(v) { const s = (v || '').trim().toUpperCase(); return /^[A-Z]{2}$/.test(s) ? s : ''; }
function sanitizeState(v) { const s = (v || '').trim().toUpperCase(); return /^[A-Z]{2,3}$/.test(s) ? s : ''; }
function sanitizeEmail(v) { const s = (v || '').trim(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : ''; }
const STATE_REQUIRED = ['US', 'CA', 'AU'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  let body;
  try { body = JSON.parse(event.body); } catch { return json(400, { error: 'Invalid JSON' }); }

  const items = body.items || [];
  const r = body.recipient || {};
  if (!items.length) return json(400, { error: 'Cart is empty' });

  // Normalize + validate the recipient before we charge anyone, so a bad
  // address can't take a payment for an order Printful will later reject.
  const name = (r.name || '').trim();
  const address1 = (r.address1 || '').trim();
  const address2 = (r.address2 || '').trim();
  const city = (r.city || '').trim();
  const zip = (r.zip || '').trim();
  const phone = (r.phone || '').trim();
  const email = sanitizeEmail(r.email);
  const country_code = sanitizeCountry(r.country_code);
  const state_code = sanitizeState(r.state_code);

  if (!name || !address1 || !city || !zip) return json(400, { error: 'Missing shipping details' });
  if (!country_code) return json(400, { error: 'Please select a valid country.' });
  if (STATE_REQUIRED.includes(country_code) && !state_code) {
    return json(400, { error: 'A state/province code is required for ' + country_code + ' (e.g. CA, NY, ON).' });
  }

  const base = 'https://' + event.headers.host;

  try {
    let currency = 'EUR';
    const lineItems = [];
    const pfItems = [];
    for (const it of items) {
      const vRes = await fetch(PF + '/sync/variant/' + it.syncVariantId, { headers: pfHeaders() });
      const v = await vRes.json();
      if (!vRes.ok || !v.result) return json(400, { error: 'Invalid product in cart' });
      const sv = v.result.sync_variant || v.result;
      currency = sv.currency || 'EUR';
      const qty = Math.max(1, Math.min(20, parseInt(it.qty, 10) || 1));
      const price = parseFloat(sv.retail_price);
      if (!isFinite(price) || !sv.variant_id) return json(502, { error: 'Could not read product price from Printful' });
      lineItems.push({
        price_data: { currency: currency.toLowerCase(), product_data: { name: sv.name || 'Item' }, unit_amount: Math.round(price * 100) },
        quantity: qty
      });
      pfItems.push({ variant_id: sv.variant_id, sync_variant_id: sv.id, quantity: qty });
    }

    // Printful shipping rate
    let shippingAmount = 0, shippingName = 'Shipping';
    try {
      const sRes = await fetch(PF + '/shipping/rates', {
        method: 'POST', headers: pfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          recipient: { address1, city, country_code, state_code, zip },
          items: pfItems.map(i => ({ variant_id: i.variant_id, quantity: i.quantity }))
        })
      });
      const s = await sRes.json();
      if (sRes.ok && s.result && s.result.length) {
        const rate = parseFloat(s.result[0].rate);
        if (isFinite(rate)) { shippingAmount = Math.round(rate * 100); shippingName = s.result[0].name || 'Shipping'; }
      }
    } catch { /* shipping optional; proceed without if it fails */ }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer_email: email || undefined,
      shipping_options: shippingAmount > 0 ? [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: shippingAmount, currency: currency.toLowerCase() }, display_name: shippingName } }] : undefined,
      success_url: base + '/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: base + '/shop.html',
      metadata: {
        pf_name: name, pf_email: email, pf_phone: phone, pf_address1: address1, pf_address2: address2, pf_city: city,
        pf_state: state_code, pf_country: country_code, pf_zip: zip,
        pf_items: JSON.stringify(pfItems.map(i => ({ v: i.sync_variant_id, q: i.quantity }))).slice(0, 490)
      }
    });
    return json(200, { url: session.url });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
