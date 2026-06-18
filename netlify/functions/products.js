const PF = 'https://api.printful.com';
let cache = null, cacheTime = 0;

function pfHeaders() {
  const h = { Authorization: 'Bearer ' + process.env.PRINTFUL_API_KEY };
  if (process.env.PRINTFUL_STORE_ID) h['X-PF-Store-Id'] = process.env.PRINTFUL_STORE_ID;
  return h;
}
function json(status, body) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (!process.env.PRINTFUL_API_KEY) return json(500, { error: 'Missing PRINTFUL_API_KEY' });
  const qs = (event && event.queryStringParameters) || {};
  const bypass = qs.refresh === '1' || qs.nocache === '1';
  if (!bypass && cache && Date.now() - cacheTime < 300000) return json(200, cache);
  try {
    const headers = pfHeaders();
    const listRes = await fetch(PF + '/sync/products?limit=100', { headers });
    const list = await listRes.json();
    if (!listRes.ok) return json(listRes.status, { error: (list.error && list.error.message) || 'Printful list error' });

    const products = [];
    for (const p of (list.result || [])) {
      const dRes = await fetch(PF + '/sync/products/' + p.id, { headers });
      const d = await dRes.json();
      if (!dRes.ok || !d.result) continue;
      const sp = d.result.sync_product || {};
      const variants = (d.result.sync_variants || []).filter(v => !v.is_ignored).map(v => ({
        syncVariantId: v.id,
        variantId: v.variant_id,
        name: v.name,
        price: v.retail_price,
        currency: v.currency || 'EUR',
        image: (v.files && (v.files.find(f => f.type === 'preview') || {}).preview_url) || (v.product && v.product.image) || sp.thumbnail_url
      }));
      if (!variants.length) continue;
      products.push({
        id: sp.id,
        name: sp.name,
        thumbnail: sp.thumbnail_url,
        currency: variants[0].currency,
        priceFrom: Math.min(...variants.map(v => parseFloat(v.price))).toFixed(2),
        variants
      });
    }
    cache = { products }; cacheTime = Date.now();
    return json(200, cache);
  } catch (e) {
    return json(500, { error: e.message });
  }
};
