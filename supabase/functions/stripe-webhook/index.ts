// deno-lint-ignore-file no-explicit-any
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10' as any,
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const PRO_PRICE_ID  = 'price_1TFJfkEmZWsJibucl22phWB3';
const EXEC_PRICE_ID = 'price_1TFJfkEmZWsJibucAw0qXn6q';

function tierFromPriceId(priceId: string): 'pro' | 'executive' {
  return priceId === EXEC_PRICE_ID ? 'executive' : 'pro';
}

async function userIdFromCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  return data?.id ?? null;
}

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('[stripe-webhook] Invalid signature:', err.message);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        if (!userId) { console.warn('[stripe-webhook] No userId on session'); break; }

        const customerId = session.customer as string;

        let tier: 'pro' | 'executive' = 'pro';
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = sub.items.data[0]?.price.id;
          if (priceId) tier = tierFromPriceId(priceId);
        }

        await supabase
          .from('profiles')
          .update({ tier, stripe_customer_id: customerId })
          .eq('id', userId);

        console.log(`[stripe-webhook] checkout.completed userId=${userId} tier=${tier}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const userId = sub.metadata?.userId ?? await userIdFromCustomer(customerId);
        if (!userId) { console.warn('[stripe-webhook] No userId for customer:', customerId); break; }

        const priceId = sub.items.data[0]?.price.id;
        const tier = tierFromPriceId(priceId);
        await supabase.from('profiles').update({ tier }).eq('id', userId);
        console.log(`[stripe-webhook] subscription.updated userId=${userId} tier=${tier}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const userId = sub.metadata?.userId ?? await userIdFromCustomer(customerId);
        if (!userId) { console.warn('[stripe-webhook] No userId for customer:', customerId); break; }

        await supabase.from('profiles').update({ tier: 'free' }).eq('id', userId);
        console.log(`[stripe-webhook] subscription.deleted userId=${userId} → free`);
        break;
      }
    }
  } catch (err: any) {
    console.error('[stripe-webhook] Handler error:', err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
