import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Zap, Shield, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import useSubscription, { PLAN_LABELS, PLAN_LIMITS } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";

const PLANS = [
  {
    key: "free",
    name: "Free Trial",
    price: 0,
    priceLabel: "Free",
    description: "Get started with limited access to explore NeuroSync",
    icon: Zap,
    color: "teal",
    features: [
      "5 clinical consultations",
      "2 SOAP note generations",
      "DSM-5-TR reference",
      "Medication lookups",
    ],
    cta: null, // no checkout for free
  },
  {
    key: "professional",
    name: "Professional",
    price: 249,
    priceLabel: "$249",
    description: "Unlimited clinical AI for individual practitioners",
    icon: Shield,
    color: "violet",
    popular: true,
    features: [
      "Unlimited consultations",
      "Unlimited SOAP notes",
      "CPT-aware documentation",
      "Full knowledge base + PDF upload",
      "Advanced psychopharmacology guidance",
      "Evidence-based citations",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: 1499,
    priceLabel: "$1,499",
    description: "Up to 10 clinician seats for group practices",
    icon: Star,
    color: "amber",
    features: [
      "Everything in Professional",
      "Up to 10 clinician seats",
      "Shared knowledge base",
      "Priority support",
      "Custom protocol uploads",
    ],
  },
];

const colorMap = {
  teal: { bg: "bg-teal-50", border: "border-teal-200", icon: "bg-teal-500", btn: "bg-teal-600 hover:bg-teal-700", check: "text-teal-500", badge: "bg-teal-100 text-teal-700" },
  violet: { bg: "bg-violet-50", border: "border-violet-300", icon: "bg-violet-500", btn: "bg-violet-600 hover:bg-violet-700", check: "text-violet-500", badge: "bg-violet-100 text-violet-700" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", icon: "bg-amber-500", btn: "bg-amber-600 hover:bg-amber-700", check: "text-amber-500", badge: "bg-amber-100 text-amber-700" },
};

export default function Subscription() {
  const { subscription, loading } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);


  const params = new URLSearchParams(window.location.search);
  const isSuccess = params.get("success") === "true";
  const isCanceled = params.get("canceled") === "true";

  const handleSubscribe = async (plan) => {
    if (window.self !== window.top) {
      alert("Checkout only works from the published app, not inside the preview.");
      return;
    }
    setLoadingPlan(plan.key);
    try {
      const origin = window.location.origin;
      const response = await base44.functions.invoke("createCheckout", {
        plan: plan.key,
        successUrl: `${origin}/Subscription?success=true`,
        cancelUrl: `${origin}/Subscription?canceled=true`,
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        toast.error("Failed to start checkout.");
      }
    } catch (err) {
      toast.error("Checkout error. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      // "God Mode" promo — activates unlimited free access silently
      if (promoCode.trim().toLowerCase() === "god mode") {
        await base44.functions.invoke("activateGodMode", {});
        toast.success("Promo applied! Unlimited access enabled.");
        window.location.reload();
        return;
      }
      if (window.self !== window.top) {
        alert("Checkout only works from the published app, not inside the preview.");
        return;
      }
      const origin = window.location.origin;
      const response = await base44.functions.invoke("createCheckout", {
        plan: "professional",
        promoCode: promoCode.trim(),
        successUrl: `${origin}/Subscription?success=true`,
        cancelUrl: `${origin}/Subscription?canceled=true`,
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        toast.error("Invalid promo code or checkout failed.");
      }
    } catch (err) {
      toast.error("Promo code error. Please try again.");
    } finally {
      setPromoLoading(false);
    }
  };

  const currentPlan = subscription?.plan || "free";
  const limits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.free;
  const isUnlimited = limits.consults === null;

  return (
    <div className="min-h-full bg-gray-50/50 px-4 py-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">NeuroSync Plans</h1>
          <p className="text-gray-500 max-w-xl mx-auto text-sm">
            Clinical AI built for psychiatrists and PMHNPs.
          </p>
        </div>

        {/* Banners */}
        {isSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-sm font-medium text-center">
            🎉 Subscription activated! Welcome to NeuroSync.
          </div>
        )}
        {isCanceled && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium text-center">
            Checkout canceled — your plan has not changed.
          </div>
        )}

        {/* Current plan status */}
        {!loading && subscription && (
          <div className="mb-8 p-4 rounded-xl bg-white border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Current Plan</p>
              <p className="text-sm font-bold text-gray-900">{PLAN_LABELS[currentPlan] || currentPlan}</p>
            </div>
            {!isUnlimited && (
              <>
                <div className="h-8 w-px bg-gray-100" />
                <div>
                  <p className="text-xs text-gray-400">Consults Used</p>
                  <p className="text-sm font-semibold text-gray-700">{subscription.consults_used || 0} / {limits.consults}</p>
                </div>
                <div className="h-8 w-px bg-gray-100" />
                <div>
                  <p className="text-xs text-gray-400">SOAP Notes Used</p>
                  <p className="text-sm font-semibold text-gray-700">{subscription.soap_notes_used || 0} / {limits.soap_notes}</p>
                </div>
              </>
            )}
            {isUnlimited && (
              <span className="text-sm text-teal-600 font-medium">✓ Unlimited access</span>
            )}
            <div className="ml-auto">
              <Link to="/Consult">
                <Button size="sm" className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl">Go to Consult →</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {PLANS.map((plan) => {
            const c = colorMap[plan.color];
            const Icon = plan.icon;
            const isLoading = loadingPlan === plan.key;
            const isCurrent = currentPlan === plan.key;

            return (
              <div key={plan.key} className={`relative rounded-2xl border-2 ${plan.popular ? c.border : "border-gray-100"} bg-white shadow-sm flex flex-col overflow-hidden`}>
                {plan.popular && (
                  <div className={`absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
                    Most Popular
                  </div>
                )}
                <div className={`px-6 pt-6 pb-5 ${plan.popular ? c.bg : ""}`}>
                  <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center mb-4 shadow-sm`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">{plan.priceLabel}</span>
                    {plan.price > 0 && <span className="text-sm text-gray-400">/month</span>}
                  </div>
                </div>
                <div className="px-6 py-5 flex-1 flex flex-col gap-5">
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${c.check}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div className={`w-full mt-auto text-center py-2.5 rounded-xl text-sm font-medium ${c.badge} border ${c.border}`}>
                      ✓ Current Plan
                    </div>
                  ) : plan.price === 0 ? (
                    <div className="w-full mt-auto text-center py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-400">
                      Free — no payment needed
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(plan)}
                      disabled={!!loadingPlan}
                      className={`w-full mt-auto text-white ${c.btn} h-10 rounded-xl font-medium`}
                    >
                      {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Redirecting...</> : `Subscribe — ${plan.priceLabel}/mo`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Promo Code */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Have a Promo Code?</h3>
          <p className="text-xs text-gray-400 mb-3">Enter your promo code for special pricing or access.</p>
          <div className="flex gap-2">
            <Input
              placeholder="Enter promo code"
              value={promoCode}
              onChange={e => setPromoCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handlePromo()}
              className="max-w-xs"
            />
            <Button onClick={handlePromo} disabled={!promoCode.trim() || promoLoading} className="bg-gray-900 hover:bg-gray-800 text-white">
              {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          Payments securely processed by Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}