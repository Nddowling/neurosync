import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return new Response('Webhook Error', { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { user_email, user_id, plan } = session.metadata || {};
      if (!user_email) return Response.json({ received: true });

      const existing = await base44.asServiceRole.entities.UserSubscription.filter({ user_email });
      const subData = {
        user_email,
        user_id: user_id || '',
        plan: plan || 'professional',
        status: 'active',
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        consults_used: 0,
        soap_notes_used: 0,
        period_start: new Date().toISOString().split('T')[0],
      };

      if (existing?.length > 0) {
        await base44.asServiceRole.entities.UserSubscription.update(existing[0].id, subData);
      } else {
        await base44.asServiceRole.entities.UserSubscription.create(subData);
      }
      console.log(`Subscription activated for ${user_email} — plan: ${plan}`);
    }

    if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object;
      const existing = await base44.asServiceRole.entities.UserSubscription.filter({ stripe_subscription_id: sub.id });
      if (existing?.length > 0) {
        const newStatus = sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'canceled';
        const updateData = { status: newStatus };
        if (newStatus === 'canceled') updateData.plan = 'free';
        await base44.asServiceRole.entities.UserSubscription.update(existing[0].id, updateData);
        console.log(`Subscription ${sub.id} updated to ${newStatus}`);
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
  }

  return Response.json({ received: true });
});