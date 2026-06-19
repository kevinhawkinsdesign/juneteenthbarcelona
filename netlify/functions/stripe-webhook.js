const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PF = 'https://api.printful.com';

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const payload = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  let evt;
  try {
    evt = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return { statusCode: 400, body: 'Webhook signature verification failed: ' + e.message };
  }

  if (evt.type === 'checkout.session.completed') {
    const s = evt.data.object;
    const m = s.metadata || {};
    let items = [];
    try { items = JSON.parse(m.pf_items || '[]'); } catch {}
    const order = {
      recipient: {
        name: m.pf_name,
        email: m.pf_email || (s.customer_details && s.customer_details.email) || '',
        phone: m.pf_phone || '', address1: m.pf_address1, city: m.pf_city, state_code: m.pf_state || '',
        country_code: m.pf_country, zip: m.pf_zip
      },
      items: items.map(i => ({ sync_variant_id: i.v, quantity: i.q }))
    };
    const headers = { Authorization: 'Bearer ' + process.env.PRINTFUL_API_KEY, 'Content-Type': 'application/json' };
    if (process.env.PRINTFUL_STORE_ID) headers['X-PF-Store-Id'] = process.env.PRINTFUL_STORE_ID;
    const confirm = process.env.PRINTFUL_CONFIRM_ORDERS === '1' ? '?confirm=1' : '';
    try {
      const oRes = await fetch(PF + '/orders' + confirm, { method: 'POST', headers, body: JSON.stringify(order) });
      const o = await oRes.json();
      if (!oRes.ok) console.error('Printful order error:', JSON.stringify(o));
      else console.log('Printful order created:', o.result && o.result.id);
    } catch (e) {
      console.error('Printful order exception:', e.message);
    }
  }
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
