import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

export const PLAN_LIMITS = {
  free: { consults: 5, soap_notes: 2 },
  professional: { consults: null, soap_notes: null },
  enterprise: { consults: null, soap_notes: null },
  promo_justin: { consults: null, soap_notes: null },
  god_mode: { consults: null, soap_notes: null },
};

export const PLAN_LABELS = {
  free: "Free",
  professional: "Professional",
  enterprise: "Enterprise",
  promo_justin: "Professional (Promo)",
  god_mode: "God Mode",
};

export default function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("getSubscription", {});
      setSubscription(res.data);
    } catch (e) {
      setSubscription({ plan: "free", status: "active", consults_used: 0, soap_notes_used: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  const canConsult = () => {
    if (!subscription) return false;
    const limits = PLAN_LIMITS[subscription.plan] || PLAN_LIMITS.free;
    if (limits.consults === null) return true;
    return (subscription.consults_used || 0) < limits.consults;
  };

  const canGenerateSoap = () => {
    if (!subscription) return false;
    const limits = PLAN_LIMITS[subscription.plan] || PLAN_LIMITS.free;
    if (limits.soap_notes === null) return true;
    return (subscription.soap_notes_used || 0) < limits.soap_notes;
  };

  const trackUsage = async (action) => {
    const res = await base44.functions.invoke("trackUsage", { action });
    if (res.data) {
      setSubscription(prev => ({
        ...prev,
        consults_used: res.data.consults_used ?? prev?.consults_used,
        soap_notes_used: res.data.soap_notes_used ?? prev?.soap_notes_used,
      }));
    }
    return res.data;
  };

  const isUnlimited = () => {
    if (!subscription) return false;
    const limits = PLAN_LIMITS[subscription.plan] || PLAN_LIMITS.free;
    return limits.consults === null;
  };

  return { subscription, loading, canConsult, canGenerateSoap, trackUsage, isUnlimited, refetch: fetchSubscription };
}