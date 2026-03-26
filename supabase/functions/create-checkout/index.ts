// deno-lint-ignore-file no-explicit-any
import Stripe from 'npm:stripe@14';

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
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
    console.log('[create-checkout] Stripe client ready, creating session...');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://darkoapp.com/payment-success',
      cancel_url: 'https://darkoapp.com/payment-cancel',
      client_reference_id: userId,
      subscription_data: { metadata: { userId } },
    });

    console.log('[create-checkout] Session created:', session.id, 'url present:', !!session.url);
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[create-checkout] Stripe error — message:', err?.message, '| type:', err?.type, '| code:', err?.code, '| status:', err?.statusCode);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Stripe error', type: err?.type, code: err?.code }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
