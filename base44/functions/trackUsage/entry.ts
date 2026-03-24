import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Plan limits — null = unlimited
// TESTING MODE: all plans unlimited
const PLAN_LIMITS = {
  free: { consults: null, soap_notes: null },
  professional: { consults: null, soap_notes: null },
  enterprise: { consults: null, soap_notes: null },
  promo_justin: { consults: null, soap_notes: null },
  god_mode: { consults: null, soap_notes: null },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action } = await req.json(); // 'consult' or 'soap_note'

    const subs = await base44.entities.UserSubscription.filter({ user_email: user.email });
    let sub = subs?.[0];

    if (!sub) {
      // Auto-create free record
      sub = await base44.entities.UserSubscription.create({
        user_email: user.email,
        user_id: user.id,
        plan: 'free',
        status: 'active',
        consults_used: 0,
        soap_notes_used: 0,
        period_start: new Date().toISOString().split('T')[0],
      });
    }

    const plan = sub.plan || 'free';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    // Check limit
    if (action === 'consult' && limits.consults !== null) {
      if ((sub.consults_used || 0) >= limits.consults) {
        return Response.json({ allowed: false, reason: `Free plan limit reached (${limits.consults} consults). Please upgrade.` });
      }
    }
    if (action === 'soap_note' && limits.soap_notes !== null) {
      if ((sub.soap_notes_used || 0) >= limits.soap_notes) {
        return Response.json({ allowed: false, reason: `Free plan limit reached (${limits.soap_notes} SOAP notes). Please upgrade.` });
      }
    }

    // Increment usage
    const update = {};
    if (action === 'consult') update.consults_used = (sub.consults_used || 0) + 1;
    if (action === 'soap_note') update.soap_notes_used = (sub.soap_notes_used || 0) + 1;

    await base44.entities.UserSubscription.update(sub.id, update);

    return Response.json({ allowed: true, plan, consults_used: update.consults_used ?? sub.consults_used, soap_notes_used: update.soap_notes_used ?? sub.soap_notes_used });
  } catch (error) {
    console.error('trackUsage error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});