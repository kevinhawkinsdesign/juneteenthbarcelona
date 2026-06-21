const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');
const PF = 'https://api.printful.com';

// Defensive: metadata is already sanitized in create-checkout-session, but
// never let a full state name ("California", "Catalunya") reach Printful.
function sanitizeState(v) { const s = (v || '').trim().toUpperCase(); return /^[A-Z]{2,3}$/.test(s) ? s : ''; }

function money(cents, cur) {
  const n = (cents || 0) / 100;
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: (cur || 'EUR').toUpperCase() }).format(n); }
  catch { return n.toFixed(2) + ' ' + (cur || 'EUR').toUpperCase(); }
}

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function sendConfirmationEmail({ to, name, recipient, session, lineItems }) {
  const user = process.env.GMAIL_USER;
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  if (!user || !pass) { console.log('Skipping confirmation email: GMAIL_USER / GMAIL_APP_PASSWORD not set'); return; }
  if (!to) { console.log('Skipping confirmation email: no recipient email'); return; }

  const cur = session.currency || 'eur';
  const rows = (lineItems || []).map(li =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">${esc(li.description || 'Item')} &times; ${li.quantity}</td>` +
    `<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${money(li.amount_total, cur)}</td></tr>`
  ).join('');
  // Stripe's webhook session object often doesn't populate shipping_cost, which
  // made the email show "Shipping €0.00" even though shipping was charged and
  // included in the total. Derive it robustly so the breakdown reconciles.
  const subtotalCents = session.amount_subtotal || 0;
  const totalCents = session.amount_total || 0;
  const td = session.total_details || {};
  let shippingCents = (session.shipping_cost && session.shipping_cost.amount_total) || td.amount_shipping || 0;
  if (!shippingCents) shippingCents = Math.max(0, totalCents - subtotalCents - (td.amount_tax || 0) + (td.amount_discount || 0));
  const addr = [recipient.address1, recipient.address2, recipient.city, recipient.state_code, recipient.zip, recipient.country_code]
    .filter(Boolean).map(esc).join(', ');

  const html = `<!doctype html><html><body style="margin:0;background:#f6f6f4;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#0a5c36;color:#fff;padding:20px 24px;border-radius:10px 10px 0 0;">
      <h1 style="margin:0;font-size:20px;">Thank you for your order${name ? ', ' + esc(name) : ''}!</h1>
      <p style="margin:8px 0 0;opacity:.9;font-size:14px;">Juneteenth Barcelona — your order is confirmed.</p>
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 10px 10px;">
      <table style="width:100%;border-collapse:collapse;font-size:15px;">${rows}
        <tr><td style="padding:8px 0;color:#555;">Subtotal</td><td style="padding:8px 0;text-align:right;color:#555;">${money(subtotalCents, cur)}</td></tr>
        <tr><td style="padding:8px 0;color:#555;">Shipping</td><td style="padding:8px 0;text-align:right;color:#555;">${money(shippingCents, cur)}</td></tr>
        <tr><td style="padding:12px 0 0;font-weight:bold;border-top:1px solid #eee;">Total</td><td style="padding:12px 0 0;text-align:right;font-weight:bold;border-top:1px solid #eee;">${money(totalCents, cur)}</td></tr>
      </table>
      <h3 style="margin:24px 0 6px;font-size:14px;color:#555;">Shipping to</h3>
      <p style="margin:0;font-size:15px;line-height:1.5;">${esc(name)}<br>${addr}</p>
      <p style="margin:24px 0 0;font-size:13px;color:#777;line-height:1.6;">
        We'll email you tracking once your order ships. Questions? Just reply to this email.
      </p>
    </div>
    <p style="text-align:center;color:#999;font-size:12px;margin:16px 0 0;">Juneteenth Barcelona &middot; juneteenth.es</p>
  </div></body></html>`;

  const fromName = process.env.ORDER_FROM_NAME || 'Juneteenth Barcelona';
  const replyTo = process.env.ORDER_REPLY_TO || user;
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user, pass }
  });
  const mail = {
    from: '"' + fromName + '" <' + user + '>',
    to,
    replyTo,
    subject: 'Your Juneteenth Barcelona order is confirmed',
    html
  };
  if (process.env.ORDER_NOTIFY_EMAIL) mail.bcc = process.env.ORDER_NOTIFY_EMAIL;

  try {
    const info = await transporter.sendMail(mail);
    console.log('Confirmation email sent to', to, info.messageId);
  } catch (e) {
    console.error('Confirmation email exception:', e.message);
  }
}

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
    const country = (m.pf_country || '').trim();
    const country_code = country.length === 2 ? country.toUpperCase() : '';
    if (!country_code) { console.error('Invalid country_code in metadata:', country); return { statusCode: 200, body: JSON.stringify({ received: true }) }; }
    const email = m.pf_email || (s.customer_details && s.customer_details.email) || '';
    const recipient = {
      name: m.pf_name,
      email,
      phone: m.pf_phone || '', address1: m.pf_address1, address2: m.pf_address2 || '', city: m.pf_city,
      state_code: sanitizeState(m.pf_state),
      country_code, zip: m.pf_zip
    };
    const order = { recipient, items: items.map(i => ({ sync_variant_id: i.v, quantity: i.q })) };

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

    // Send the customer a confirmation regardless of Printful outcome — they paid.
    let lineItems = [];
    try {
      const li = await stripe.checkout.sessions.listLineItems(s.id, { limit: 50 });
      lineItems = li.data || [];
    } catch (e) {
      console.error('listLineItems failed:', e.message);
    }
    await sendConfirmationEmail({ to: email, name: recipient.name, recipient, session: s, lineItems });
  }
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
