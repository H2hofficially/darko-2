// deno-lint-ignore-file no-explicit-any

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const keyExists = !!Deno.env.get('STRIPE_SECRET_KEY');
  console.log('[create-checkout] STRIPE_SECRET_KEY exists:', keyExists);

  let body: any;
  try {
    body = await req.json();
    console.log('[create-checkout] priceId:', body?.priceId, 'userId present:', !!body?.userId);
  } catch (parseErr: any) {
    console.error('[create-checkout] Body parse error:', parseErr?.message);
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { priceId, userId } = body;

  if (!priceId || !userId) {
    console.error('[create-checkout] Missing priceId or userId');
    return new Response(JSON.stringify({ error: 'Missing priceId or userId' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('[create-checkout] Calling Stripe API directly...');

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'success_url': 'https://darkoapp.com/payment-success',
        'cancel_url': 'https://darkoapp.com/payment-cancel',
        'client_reference_id': userId,
        'subscription_data[metadata][userId]': userId,
      }).toString(),
    });

    const data = await response.json();
    console.log('[create-checkout] Stripe response status:', response.status, 'url present:', !!data?.url, 'error:', data?.error?.message ?? 'none');

    if (!response.ok) {
      console.error('[create-checkout] Stripe error:', data?.error?.type, data?.error?.code, data?.error?.message);
      return new Response(
        JSON.stringify({ error: data?.error?.message ?? 'Stripe error', type: data?.error?.type, code: data?.error?.code }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ url: data.url }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[create-checkout] Fetch error:', err?.message);
    return new Response(JSON.stringify({ error: err?.message ?? 'Fetch failed' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
