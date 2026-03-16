import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Check, Zap, Shield, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PLANS = [
  {
    name: "Starter",
    price: 49,
    priceId: "price_1TBbvA6A0isV0j4oFQSVtdWr",
    description: "Essential clinical AI support for individual practitioners",
    icon: Zap,
    color: "teal",
    features: [
      "AI clinical decision support",
      "DSM-5-TR reference",
      "Medication lookups",
      "10 SOAP notes/month",
      "Basic knowledge base",
    ],
  },
  {
    name: "Professional",
    price: 99,
    priceId: "price_1TBbvA6A0isV0j4oNt2iD4gG",
    description: "Full clinical AI suite for active practitioners",
    icon: Shield,
    color: "violet",
    popular: true,
    features: [
      "Everything in Starter",
      "Unlimited SOAP notes",
      "CPT-aware documentation",
      "Full knowledge base with PDF upload",
      "Advanced psychopharmacology guidance",
      "Evidence-based citations",
    ],
  },
  {
    name: "Enterprise",
    price: 249,
    priceId: "price_1TBbvA6A0isV0j4oqNBIPcLD",
    description: "For group practices and multi-clinician organizations",
    icon: Star,
    color: "amber",
    features: [
      "Everything in Professional",
      "Up to 10 clinician seats",
      "Shared knowledge base",
      "Priority support",
      "Custom protocol uploads",
      "Usage analytics",
    ],
  },
];

const colorMap = {
  teal: {
    bg: "bg-teal-50",
    border: "border-teal-200",
    badge: "bg-teal-100 text-teal-700",
    icon: "bg-teal-500",
    btn: "bg-teal-600 hover:bg-teal-700",
    check: "text-teal-500",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-300",
    badge: "bg-violet-100 text-violet-700",
    icon: "bg-violet-500",
    btn: "bg-violet-600 hover:bg-violet-700",
    check: "text-violet-500",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    icon: "bg-amber-500",
    btn: "bg-amber-600 hover:bg-amber-700",
    check: "text-amber-500",
  },
};

export default function Subscription() {
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handleSubscribe = async (plan) => {
    // Block if in iframe (preview mode)
    if (window.self !== window.top) {
      alert("Checkout only works from the published app, not inside the preview.");
      return;
    }

    setLoadingPlan(plan.priceId);
    try {
      const origin = window.location.origin;
      const response = await base44.functions.invoke("createCheckout", {
        priceId: plan.priceId,
        successUrl: `${origin}/Subscription?success=true`,
        cancelUrl: `${origin}/Subscription?canceled=true`,
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        toast.error("Failed to start checkout. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Checkout error. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  // Show success/cancel banners based on URL params
  const params = new URLSearchParams(window.location.search);
  const isSuccess = params.get("success") === "true";
  const isCanceled = params.get("canceled") === "true";

  return (
    <div className="min-h-full bg-gray-50/50 px-4 py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">NeuroSync Plans</h1>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            Clinical AI built for psychiatrists and PMHNPs. Choose the plan that fits your practice.
          </p>
        </div>

        {/* Banners */}
        {isSuccess && (
          <div className="mb-8 p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-sm font-medium text-center">
            🎉 Subscription activated! Welcome to NeuroSync.
          </div>
        )}
        {isCanceled && (
          <div className="mb-8 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium text-center">
            Checkout canceled. Your plan has not changed.
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const c = colorMap[plan.color];
            const Icon = plan.icon;
            const isLoading = loadingPlan === plan.priceId;

            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border-2 ${plan.popular ? c.border : "border-gray-100"} bg-white shadow-sm flex flex-col overflow-hidden`}
              >
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
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-sm text-gray-400">/month</span>
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

                  <Button
                    onClick={() => handleSubscribe(plan)}
                    disabled={!!loadingPlan}
                    className={`w-full mt-auto text-white ${c.btn} h-10 rounded-xl font-medium`}
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />Redirecting...</>
                    ) : (
                      `Subscribe to ${plan.name}`
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Payments are securely processed by Stripe. Cancel anytime from your billing portal.
        </p>
      </div>
    </div>
  );
}