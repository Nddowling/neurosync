import React, { useState } from "react";
import { AlertTriangle, X, Info } from "lucide-react";

/**
 * variant: "phi" | "decision-support" | "emergency" | "soap-draft" | "medications"
 * dismissible: bool (default true)
 */
export default function ClinicalWarningBanner({ variant = "decision-support", dismissible = true, className = "" }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const configs = {
    "phi": {
      icon: Info,
      color: "bg-teal-50 border-teal-200 text-teal-800",
      iconColor: "text-teal-600",
      title: "HIPAA Certified Platform",
      body: "NeuroSync is HIPAA certified. Patient data is encrypted end-to-end and handled in compliance with federal privacy regulations.",
    },
    "decision-support": {
      icon: Info,
      color: "bg-blue-50 border-blue-200 text-blue-800",
      iconColor: "text-blue-500",
      title: "Clinical Decision Support — Not a Diagnosis Tool",
      body: "AI outputs are for reference only. All clinical decisions remain the sole responsibility of the treating licensed clinician. Verify all information independently.",
    },
    "emergency": {
      icon: AlertTriangle,
      color: "bg-red-50 border-red-200 text-red-800",
      iconColor: "text-red-600",
      title: "⚠ Emergency Situations",
      body: "NeuroSync is NOT an emergency response system. For imminent patient safety risk, contact 911 or activate your institution's crisis protocol immediately.",
    },
    "soap-draft": {
      icon: AlertTriangle,
      color: "bg-amber-50 border-amber-200 text-amber-800",
      iconColor: "text-amber-600",
      title: "Draft Documentation — Clinician Review Required",
      body: "AI-generated SOAP notes are drafts only. Review, modify, and attest all content before inclusion in any medical record. Do not include PHI.",
    },
    "medications": {
      icon: AlertTriangle,
      color: "bg-amber-50 border-amber-200 text-amber-800",
      iconColor: "text-amber-600",
      title: "Medication Reference — Verify Before Prescribing",
      body: "AI-generated medication information may be incomplete or outdated. Always verify dosing, interactions, and black box warnings against current prescribing references (FDA, manufacturer labeling). Not a substitute for clinical pharmacology judgment.",
    },
  };

  const cfg = configs[variant] || configs["decision-support"];
  const Icon = cfg.icon;

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${cfg.color} ${className}`}>
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.iconColor}`} />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-bold">{cfg.title} </span>
        <span className="text-xs leading-relaxed">{cfg.body}</span>
      </div>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}