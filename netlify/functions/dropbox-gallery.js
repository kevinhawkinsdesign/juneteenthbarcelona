// Dropbox-powered gallery API. Serves a cached listing of photos & videos from a
// Dropbox folder, and resolves thumbnails / full files / downloads on demand.
// All secrets live in Netlify env vars — nothing sensitive is committed.
//
//   GET ?            -> JSON listing { items: [...] } (cached)
//   GET ?refresh=1   -> rebuild listing, bypassing the cache
//   GET ?thumb=ID    -> small JPEG thumbnail (proxied, edge-cached)
//   GET ?file=ID     -> 302 redirect to a temporary link (inline view / video stream)
//   GET ?download=ID -> 302 redirect to a forced-download link
//
// Caching: the listing is stored in Netlify Blobs with a 30-minute fallback
// max-age. The companion dropbox-webhook function clears it the moment files
// change in Dropbox, so new uploads appear within seconds instead of waiting out
// the 30 minutes. The 30 minutes is just a safety net for any missed webhook.

const { getStore } = require('@netlify/blobs');

const API = 'https://api.dropboxapi.com';
const CONTENT = 'https://content.dropboxapi.com';
const LISTING_TTL = 30 * 60 * 1000; // 30-minute fallback

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'tiff']);
const VIDEO_EXT = new Set(['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv', '3gp']);

// Access tokens last 4h; cache per warm instance and refresh from the long-lived
// refresh token a little before expiry.
let tokenCache = { token: null, exp: 0 };

async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.exp) return tokenCache.token;
  const auth = Buffer.from(process.env.DROPBOX_APP_KEY + ':' + process.env.DROPBOX_APP_SECRET).toString('base64');
  const res = await fetch(API + '/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(process.env.DROPBOX_REFRESH_TOKEN)
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Token refresh failed: ' + (data.error_description || res.status));
  tokenCache = { token: data.access_token, exp: Date.now() + (data.expires_in - 300) * 1000 };
  return tokenCache.token;
}

async function rpc(token, path, body) {
  const res = await fetch(API + '/2' + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error('Dropbox ' + path + ' error'); e.data = data; e.status = res.status; throw e; }
  return data;
}

function extOf(name) { const i = name.lastIndexOf('.'); return i < 0 ? '' : name.slice(i + 1).toLowerCase(); }
function captionOf(name) { const i = name.lastIndexOf('.'); return (i < 0 ? name : name.slice(0, i)).replace(/[._-]+/g, ' ').trim(); }

function folderPath() {
  let f = process.env.DROPBOX_GALLERY_FOLDER || '';
  if (f === '/') f = '';
  if (f && !f.startsWith('/')) f = '/' + f;
  return f.replace(/\/+$/, '');
}

async function buildListing(token) {
  const entries = [];
  let resp = await rpc(token, '/files/list_folder', { path: folderPath(), recursive: false, limit: 2000 });
  entries.push(...resp.entries);
  while (resp.has_more) {
    resp = await rpc(token, '/files/list_folder/continue', { cursor: resp.cursor });
    entries.push(...resp.entries);
  }

  const items = entries
    .filter(e => e['.tag'] === 'file')
    .map(e => {
      const type = IMAGE_EXT.has(extOf(e.name)) ? 'image' : VIDEO_EXT.has(extOf(e.name)) ? 'video' : null;
      if (!type) return null;
      return { id: e.id, name: e.name, type, rev: e.rev, caption: captionOf(e.name), modified: e.server_modified || e.client_modified || '' };
    })
    .filter(Boolean)
    .sort((a, b) => (b.modified || '').localeCompare(a.modified || '')); // newest first

  return { items, builtAt: Date.now() };
}

// Create a shared link (or reuse the existing one) and force the download flag.
async function downloadUrl(token, path) {
  let url;
  try {
    url = (await rpc(token, '/sharing/create_shared_link_with_settings', { path })).url;
  } catch (e) {
    const err = e.data && e.data.error;
    if (err && err['.tag'] === 'shared_link_already_exists') {
      const meta = err.shared_link_already_exists && err.shared_link_already_exists.metadata;
      url = (meta && meta.url) || (await rpc(token, '/sharing/list_shared_links', { path, direct_only: true })).links[0].url;
    } else throw e;
  }
  return /dl=0/.test(url) ? url.replace('dl=0', 'dl=1') : url + (url.includes('?') ? '&' : '?') + 'dl=1';
}

function json(status, body, cacheSeconds) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': cacheSeconds ? `public, max-age=${cacheSeconds}` : 'no-store' },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  const qs = (event && event.queryStringParameters) || {};
  if (!process.env.DROPBOX_REFRESH_TOKEN) return json(500, { error: 'Dropbox not configured', items: [] });

  try {
    const token = await getAccessToken();

    // ── Thumbnail proxy (small JPEG, heavily edge-cached per file revision) ──
    if (qs.thumb) {
      const res = await fetch(CONTENT + '/2/files/get_thumbnail_v2', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Dropbox-API-Arg': JSON.stringify({ resource: { '.tag': 'path', path: qs.thumb }, format: 'jpeg', size: 'w640h480', mode: 'fit_one_bordered' })
        }
      });
      if (!res.ok) return json(res.status, { error: 'thumbnail unavailable' });
      const buf = Buffer.from(await res.arrayBuffer());
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
          'Netlify-CDN-Cache-Control': 'public, max-age=2592000, immutable'
        },
        body: buf.toString('base64'),
        isBase64Encoded: true
      };
    }

    // ── Inline file link (lightbox image / video stream) ──
    if (qs.file) {
      const link = await rpc(token, '/files/get_temporary_link', { path: qs.file });
      return { statusCode: 302, headers: { Location: link.link, 'Cache-Control': 'private, max-age=3600' }, body: '' };
    }

    // ── Forced download ──
    if (qs.download) {
      const link = await downloadUrl(token, qs.download);
      return { statusCode: 302, headers: { Location: link, 'Cache-Control': 'private, max-age=3600' }, body: '' };
    }

    // ── Listing (default) ──
    const store = getStore('dropbox-gallery');
    const force = qs.refresh === '1' || qs.nocache === '1';
    let cached = null;
    try { cached = await store.get('listing', { type: 'json' }); } catch { /* cold store */ }
    if (!force && cached && Date.now() - cached.builtAt < LISTING_TTL) {
      return json(200, { items: cached.items, cached: true }, 60);
    }
    const listing = await buildListing(token);
    try { await store.setJSON('listing', listing); } catch { /* non-fatal */ }
    return json(200, { items: listing.items, cached: false }, 60);
  } catch (e) {
    return json(e.status || 500, { error: e.message || 'Dropbox error', items: [] });
  }
};
