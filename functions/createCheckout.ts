import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PROMO_CODES = {
  JUSTIN: { plan: 'promo_justin', priceId: null, discount: true },
};

// Justin promo price - $100/mo unlimited (we'll use a coupon approach via checkout)
// We create the checkout with a special price for promo users
const PLAN_PRICES = {
  professional: 'price_1TBcHH4aBs94BH0vbmooRNwT',
  enterprise: 'price_1TBcHH4aBs94BH0vO4tuoC7c',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan, promoCode, successUrl, cancelUrl } = await req.json();

    // Handle promo code "JUSTIN"
    if (promoCode && promoCode.toUpperCase() === 'JUSTIN') {
      // Create a $100/mo price on the Professional product for Justin promo
      let justinPrice;
      try {
        // Check if Justin promo price already exists by looking for metadata
        const prices = await stripe.prices.list({ product: 'prod_U9w9MY3B7Z1Aa0', active: true });
        justinPrice = prices.data.find(p => p.metadata?.promo === 'justin');
        if (!justinPrice) {
          justinPrice = await stripe.prices.create({
            product: 'prod_U9w9MY3B7Z1Aa0',
            unit_amount: 10000,
            currency: 'usd',
            recurring: { interval: 'month' },
            metadata: { promo: 'justin' },
          });
        }
      } catch (e) {
        console.error('Justin promo price error:', e.message);
        return Response.json({ error: 'Promo setup error' }, { status: 500 });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: justinPrice.id, quantity: 1 }],
        customer_email: user.email,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          user_id: user.id,
          user_email: user.email,
          plan: 'promo_justin',
        },
      });
      return Response.json({ url: session.url });
    }

    const priceId = PLAN_PRICES[plan];
    if (!priceId) return Response.json({ error: 'Invalid plan' }, { status: 400 });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_id: user.id,
        user_email: user.email,
        plan,
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});