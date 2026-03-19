import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const subs = await base44.entities.UserSubscription.filter({ user_email: user.email });

    if (subs?.length > 0) {
      await base44.entities.UserSubscription.update(subs[0].id, {
        plan: 'god_mode',
        status: 'active',
        consults_used: 0,
        soap_notes_used: 0,
      });
    } else {
      await base44.entities.UserSubscription.create({
        user_email: user.email,
        user_id: user.id,
        plan: 'god_mode',
        status: 'active',
        consults_used: 0,
        soap_notes_used: 0,
        period_start: new Date().toISOString().split('T')[0],
      });
    }

    console.log(`God Mode activated for ${user.email}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('activateGodMode error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});