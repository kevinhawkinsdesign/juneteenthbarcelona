const PF = 'https://api.printful.com';
function pfHeaders() {
  const h = { Authorization: 'Bearer ' + process.env.PRINTFUL_API_KEY };
  if (process.env.PRINTFUL_STORE_ID) h['X-PF-Store-Id'] = process.env.PRINTFUL_STORE_ID;
  return h;
}
function json(status, body) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }, body: JSON.stringify(body) };
}
exports.handler = async (event) => {
  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: 'Missing product id' });
  if (!process.env.PRINTFUL_API_KEY) return json(500, { error: 'Missing PRINTFUL_API_KEY' });
  try {
    const headers = pfHeaders();
    const dRes = await fetch(PF + '/sync/products/' + encodeURIComponent(id), { headers });
    const d = await dRes.json();
    if (!dRes.ok || !d.result) return json(dRes.status === 200 ? 404 : dRes.status, { error: 'Product not found' });
    const sp = d.result.sync_product || {};
    const sv = (d.result.sync_variants || []).filter(v => !v.is_ignored);
    const variants = sv.map(v => ({
      syncVariantId: v.id, variantId: v.variant_id, name: v.name,
      price: v.retail_price, currency: v.currency || 'EUR',
      image: (v.files && (v.files.find(f => f.type === 'preview') || {}).preview_url) || (v.product && v.product.image) || sp.thumbnail_url
    }));
    let sizeGuide = null;
    const catalogId = sv[0] && sv[0].product && sv[0].product.product_id;
    if (catalogId) {
      try {
        const gRes = await fetch(PF + '/products/' + catalogId + '/sizes?unit=cm', { headers });
        const g = await gRes.json();
        if (gRes.ok && g.result) sizeGuide = g.result;
      } catch {}
    }
    return json(200, {
      product: { id: sp.id, name: sp.name, thumbnail: sp.thumbnail_url, currency: (variants[0] && variants[0].currency) || 'EUR', variants },
      sizeGuide
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
