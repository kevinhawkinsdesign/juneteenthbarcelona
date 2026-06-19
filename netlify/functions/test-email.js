const nodemailer = require('nodemailer');

function json(status, body) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

// One-off helper to confirm the Gmail SMTP credentials work, without needing a
// real checkout. Guarded by TEST_EMAIL_TOKEN and only ever emails GMAIL_USER
// (the shop's own inbox), so it can never be used to send mail to anyone else.
exports.handler = async (event) => {
  const token = (event.queryStringParameters && event.queryStringParameters.token) || '';
  const expected = process.env.TEST_EMAIL_TOKEN || '';
  if (!expected) return json(403, { error: 'TEST_EMAIL_TOKEN is not set; this endpoint is disabled.' });
  if (token !== expected) return json(403, { error: 'Invalid token.' });

  const user = process.env.GMAIL_USER;
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  if (!user || !pass) return json(400, { error: 'GMAIL_USER / GMAIL_APP_PASSWORD are not both set.' });

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass }
  });
  try {
    const info = await transporter.sendMail({
      from: '"Juneteenth Barcelona" <' + user + '>',
      to: user,
      replyTo: process.env.ORDER_REPLY_TO || user,
      subject: 'Test email — Juneteenth Barcelona shop',
      text: 'Success! Your Gmail SMTP credentials work. Order confirmation emails are ready to go.'
    });
    return json(200, { ok: true, sentTo: user, messageId: info.messageId });
  } catch (e) {
    return json(502, { error: e.message });
  }
};
