import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle, FileText } from "lucide-react";

export default function TermsOfServiceModal({ onAccept, onDecline }) {
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);
  const [checked3, setChecked3] = useState(false);
  const [checked4, setChecked4] = useState(false);

  const allChecked = checked1 && checked2 && checked3 && checked4;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Terms of Service & User Agreement</h2>
            <p className="text-sm text-gray-500 mt-0.5">Please read and accept before using NeuroSync</p>
          </div>
        </div>

        {/* Critical Warning Banner */}
        <div className="mx-6 mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">⚠ IMPORTANT: Clinical Decision Support Tool — NOT a Replacement for Clinical Judgment</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              NeuroSync is an AI-assisted clinical reference tool intended to <strong>support</strong>, not replace, the professional judgment of licensed clinicians. All outputs must be independently verified by the treating clinician.
            </p>
          </div>
        </div>

        {/* Scrollable ToS Body */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-5 text-sm text-gray-700 leading-relaxed">

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-1">1. Nature of the Service</h3>
              <p>NeuroSync ("the Platform") is an AI-powered clinical decision support tool designed exclusively for use by licensed mental health professionals, including psychiatrists, psychiatric mental health nurse practitioners (PMHNPs), psychologists, and other credentialed clinicians. The Platform provides reference information, AI-generated summaries, diagnostic criteria, medication guidance, and documentation assistance.</p>
              <p className="mt-2 font-semibold text-red-700">NeuroSync does NOT provide medical diagnoses, prescriptions, or treatment orders. It is a reference and documentation aid only.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-1">2. No Protected Health Information (PHI)</h3>
              <p>NeuroSync is <strong>NOT HIPAA-certified</strong> at this time. You must NOT enter, upload, or process any Protected Health Information (PHI) as defined under HIPAA (45 CFR § 160.103), including but not limited to:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1 text-gray-600">
                <li>Patient names, dates of birth, addresses, or contact information</li>
                <li>Social Security numbers, medical record numbers, or health plan beneficiary numbers</li>
                <li>Any information that could directly or indirectly identify a patient</li>
                <li>Audio, video, or photographic recordings of patients</li>
              </ul>
              <p className="mt-2">Use only <strong>de-identified, fictional, or anonymized</strong> clinical scenarios when interacting with this Platform. Violation of this provision may expose you to federal and state legal liability.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-1">3. Professional Responsibility & Clinical Judgment</h3>
              <p>You acknowledge and agree that:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1 text-gray-600">
                <li>All clinical decisions remain solely your professional responsibility</li>
                <li>AI-generated content must be reviewed and verified before any clinical application</li>
                <li>You will not rely solely on NeuroSync output for any clinical decision affecting patient care</li>
                <li>NeuroSync's outputs may contain errors, omissions, or outdated information</li>
                <li>You are responsible for maintaining awareness of current clinical guidelines, black box warnings, and drug interactions independent of this Platform</li>
                <li>SOAP notes and clinical documentation generated by NeuroSync are drafts only and require clinician review, modification, and attestation before inclusion in any medical record</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-1">4. Scope of Licensed Use</h3>
              <p>This Platform is licensed exclusively to licensed and credentialed mental health professionals. By creating an account, you represent and warrant that:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1 text-gray-600">
                <li>You hold a valid, current, and unrestricted license to practice in your jurisdiction</li>
                <li>You are using this Platform solely for lawful professional purposes</li>
                <li>You will not share your account credentials or allow unauthorized access</li>
                <li>You are not using this Platform to provide clinical services to patients in jurisdictions where you are not licensed</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-1">5. Emergency Situations</h3>
              <p className="font-semibold text-red-700">NeuroSync is NOT an emergency response system.</p>
              <p className="mt-1">In any situation involving imminent risk to patient or clinician safety, you must follow your jurisdiction's mandatory reporting laws, contact emergency services (911), and/or activate your institution's crisis response protocols. Do not use NeuroSync as a substitute for emergency action.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-1">6. Limitation of Liability & Disclaimer of Warranties</h3>
              <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEUROSYNC AND ITS OPERATORS DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED. THE PLATFORM IS PROVIDED "AS IS." IN NO EVENT SHALL NEUROSYNC BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM, INCLUDING BUT NOT LIMITED TO PATIENT HARM, PROFESSIONAL SANCTIONS, OR LEGAL LIABILITY.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-1">7. Data & Privacy</h3>
              <p>Conversation data entered into this Platform is processed by third-party AI services. Do not enter PHI. By using this Platform, you consent to the processing of de-identified clinical queries by AI systems. NeuroSync may use anonymized, aggregated usage data to improve the service.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-1">8. Subscription & Billing</h3>
              <p>Paid subscriptions are billed monthly. You may cancel at any time; cancellation takes effect at the end of the current billing period. No refunds are issued for partial months. NeuroSync reserves the right to modify pricing with 30 days' notice.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-1">9. Modifications to Terms</h3>
              <p>NeuroSync reserves the right to update these Terms at any time. Continued use of the Platform after notification of changes constitutes acceptance. Material changes will require re-acknowledgment.</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-1">10. Governing Law</h3>
              <p>These Terms shall be governed by the laws of the United States. Any disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.</p>
            </section>

            <p className="text-xs text-gray-400 pt-2">Last updated: March 2026 · Version 1.0</p>
          </div>
        </ScrollArea>

        {/* Acknowledgment Checkboxes */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-3 bg-gray-50/50">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">I acknowledge and agree that:</p>

          {[
            { id: "c1", val: checked1, set: setChecked1, label: "I am a licensed mental health professional and will use NeuroSync solely for lawful professional purposes." },
            { id: "c2", val: checked2, set: setChecked2, label: "I will NOT enter any Protected Health Information (PHI) into this Platform, as it is not HIPAA-certified." },
            { id: "c3", val: checked3, set: setChecked3, label: "All clinical decisions are my sole professional responsibility. NeuroSync AI outputs are for reference only and must be independently verified before any clinical application." },
            { id: "c4", val: checked4, set: setChecked4, label: "I have read and agree to the full Terms of Service and User Agreement above." },
          ].map(({ id, val, set, label }) => (
            <div key={id} className="flex items-start gap-3">
              <Checkbox id={id} checked={val} onCheckedChange={set} className="mt-0.5" />
              <label htmlFor={id} className="text-xs text-gray-700 leading-relaxed cursor-pointer">{label}</label>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 border-gray-200 text-gray-600"
              onClick={onDecline}
            >
              Decline & Sign Out
            </Button>
            <Button
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
              disabled={!allChecked}
              onClick={onAccept}
            >
              <Shield className="w-4 h-4 mr-2" />
              Accept & Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}