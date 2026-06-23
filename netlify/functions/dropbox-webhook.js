// Dropbox webhook endpoint. Two jobs:
//   1. GET  — answer Dropbox's verification handshake by echoing ?challenge=...
//   2. POST — when files in the folder change, verify the signature and clear the
//             cached listing so the next gallery load rebuilds from Dropbox.
// Register this function's URL in your Dropbox app under Settings -> Webhooks:
//   https://juneteenth.es/.netlify/functions/dropbox-webhook

const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  // 1. Verification handshake
  if (event.httpMethod === 'GET') {
    const challenge = (event.queryStringParameters || {}).challenge || '';
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' },
      body: challenge
    };
  }

  // 2. Change notification — verify HMAC signature, then bust the cache
  if (event.httpMethod === 'POST') {
    let body = event.body || '';
    if (event.isBase64Encoded) body = Buffer.from(body, 'base64').toString('utf8');

    const sig = event.headers['x-dropbox-signature'] || '';
    const expected = crypto.createHmac('sha256', process.env.DROPBOX_APP_SECRET || '').update(body).digest('hex');
    let ok = false;
    try { ok = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); } catch { ok = false; }
    if (!ok) return { statusCode: 403, body: 'invalid signature' };

    try { await getStore('dropbox-gallery').delete('listing'); } catch { /* nothing cached yet */ }
    return { statusCode: 200, body: 'ok' };
  }

  return { statusCode: 405, body: 'method not allowed' };
};
