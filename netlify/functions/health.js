// Lightweight diagnostic endpoint. Reports how the deployed functions are
// configured WITHOUT ever exposing secret values. Hit:
//   https://juneteenth.es/.netlify/functions/health
function detectStripeMode(key) {
  if (!key) return 'missing';
  if (key.startsWith('sk_live_') || key.startsWith('rk_live_')) return 'live';
  if (key.startsWith('sk_test_') || key.startsWith('rk_test_')) return 'test';
  return 'unknown';
}

exports.handler = async () => {
  const sk = process.env.STRIPE_SECRET_KEY || '';
  const wh = process.env.STRIPE_WEBHOOK_SECRET || '';
  const body = {
    stripeMode: detectStripeMode(sk),
    confirmOrders: process.env.PRINTFUL_CONFIRM_ORDERS === '1',
    confirmOrdersRaw: process.env.PRINTFUL_CONFIRM_ORDERS || '(unset)',
    has: {
      stripeSecretKey: !!sk,
      stripeWebhookSecret: !!wh,
      printfulApiKey: !!process.env.PRINTFUL_API_KEY,
      printfulStoreId: !!process.env.PRINTFUL_STORE_ID
    },
    time: new Date().toISOString()
  };
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body, null, 2)
  };
};
