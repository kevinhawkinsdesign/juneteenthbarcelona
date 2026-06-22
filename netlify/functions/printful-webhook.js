const nodemailer = require('nodemailer');

// Sends a branded "your order has shipped" email when Printful fires a
// package_shipped webhook. Reuses the same Gmail SMTP credentials as the
// order confirmation email.
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function sendShippedEmail({ to, name, carrier, service, tracking_number, tracking_url, items }) {
  const user = process.env.GMAIL_USER;
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  if (!user || !pass) { console.log('Skipping shipped email: GMAIL_USER / GMAIL_APP_PASSWORD not set'); return; }
  if (!to) { console.log('Skipping shipped email: no recipient email'); return; }

  const rows = (items || []).map(it => {
    const qty = it.quantity || it.quantity === 0 ? it.quantity : 1;
    return `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;">${esc(it.name || 'Item')} &times; ${esc(qty)}</td></tr>`;
  }).join('');

  const trackBtn = tracking_url
    ? `<p style="margin:24px 0;"><a href="${esc(tracking_url)}" style="display:inline-block;background:#0a5c36;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;font-size:15px;">Track your package</a></p>`
    : '';
  const trackLine = tracking_number
    ? `<p style="margin:0 0 4px;font-size:14px;color:#555;">${esc(carrier || 'Carrier')}${service ? ' &middot; ' + esc(service) : ''}</p>
       <p style="margin:0;font-size:14px;color:#555;">Tracking number: <strong>${esc(tracking_number)}</strong></p>`
    : '';

  const html = `<!doctype html><html><body style="margin:0;background:#f6f6f4;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#0a5c36;color:#fff;padding:20px 24px;border-radius:10px 10px 0 0;">
      <h1 style="margin:0;font-size:20px;">Your order is on its way${name ? ', ' + esc(name) : ''}! 📦</h1>
      <p style="margin:8px 0 0;opacity:.9;font-size:14px;">Juneteenth Barcelona — your merch has shipped.</p>
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 10px 10px;">
      ${trackLine}
      ${trackBtn}
      ${rows ? `<h3 style="margin:18px 0 6px;font-size:14px;color:#555;">In this shipment</h3><table style="width:100%;border-collapse:collapse;font-size:15px;">${rows}</table>` : ''}
      <p style="margin:24px 0 0;font-size:13px;color:#777;line-height:1.6;">
        Tracking can take a little while to update after the label is created. Questions? Just reply to this email.
      </p>
    </div>
    <p style="text-align:center;color:#999;font-size:12px;margin:16px 0 0;">Juneteenth Barcelona &middot; juneteenth.es</p>
  </div></body></html>`;

  const fromName = process.env.ORDER_FROM_NAME || 'Juneteenth Barcelona';
  const replyTo = process.env.ORDER_REPLY_TO || user;
  const transporter = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } });
  const mail = { from: '"' + fromName + '" <' + user + '>', to, replyTo, subject: 'Your Juneteenth Barcelona order has shipped', html };
  if (process.env.ORDER_NOTIFY_EMAIL) mail.bcc = process.env.ORDER_NOTIFY_EMAIL;
  try {
    const info = await transporter.sendMail(mail);
    console.log('Shipped email sent to', to, info.messageId);
  } catch (e) {
    console.error('Shipped email exception:', e.message);
  }
}

exports.handler = async (event) => {
  // Optional shared-secret check via ?token= in the webhook URL.
  const token = (event.queryStringParameters || {}).token || '';
  if (process.env.PRINTFUL_WEBHOOK_TOKEN && token !== process.env.PRINTFUL_WEBHOOK_TOKEN) {
    return { statusCode: 401, body: 'Unauthorized' };
  }
  let body;
  try { body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  if (body.type === 'package_shipped') {
    const d = body.data || {};
    const ship = d.shipment || {};
    const order = d.order || {};
    const rec = order.recipient || {};
    await sendShippedEmail({
      to: rec.email,
      name: rec.name,
      carrier: ship.carrier,
      service: ship.service,
      tracking_number: ship.tracking_number,
      tracking_url: ship.tracking_url,
      items: ship.items || order.items
    });
  }
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
