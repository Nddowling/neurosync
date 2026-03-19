import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const subs = await base44.entities.UserSubscription.filter({ user_email: user.email });
    if (!subs?.length) {
      return Response.json({ plan: 'free', status: 'active', consults_used: 0, soap_notes_used: 0 });
    }

    const sub = subs[0];
    return Response.json({
      id: sub.id,
      plan: sub.plan,
      status: sub.status,
      consults_used: sub.consults_used || 0,
      soap_notes_used: sub.soap_notes_used || 0,
      period_start: sub.period_start,
    });
  } catch (error) {
    console.error('getSubscription error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});