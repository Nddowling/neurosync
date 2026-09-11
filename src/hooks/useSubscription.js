import { useState, useEffect, useCallback } from "react";
import { neurosync } from "@/api/client";

// Plan limits — null = unlimited
export const PLAN_LIMITS = {
  free: { consults: 5, soap_notes: 3 },
  professional: { consults: null, soap_notes: null },
  enterprise: { consults: null, soap_notes: null },
  promo_justin: { consults: null, soap_notes: null },
};

export const PLAN_LABELS = {
  free: "Free",
  professional: "Professional",
  enterprise: "Enterprise",
  promo_justin: "Professional (Promo)",
};

export default function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await neurosync.functions.invoke("getSubscription", {});
      setSubscription(res.data);
    } catch (e) {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  const canConsult = () => {
    if (!subscription) return true; // allow while loading, server will enforce
    const limits = PLAN_LIMITS[subscription.plan] || PLAN_LIMITS.free;
    if (limits.consults === null) return true;
    return (subscription.consults_used || 0) < limits.consults;
  };

  const canGenerateSoap = () => {
    if (!subscription) return true; // allow while loading, server will enforce
    const limits = PLAN_LIMITS[subscription.plan] || PLAN_LIMITS.free;
    if (limits.soap_notes === null) return true;
    return (subscription.soap_notes_used || 0) < limits.soap_notes;
  };

  const isUnlimited = () => {
    if (!subscription) return false;
    const limits = PLAN_LIMITS[subscription.plan] || PLAN_LIMITS.free;
    return limits.consults === null;
  };

  return { subscription, loading, canConsult, canGenerateSoap, isUnlimited, refetch: fetchSubscription };
}