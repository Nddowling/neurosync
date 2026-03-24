import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Stethoscope, Brain, FileText, Shield, ChevronRight, CheckCircle2,
  Zap, BookOpen, Users, Calendar, Database, MessageSquare, Star,
  ArrowRight, Lock, Activity, Pill
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Brain,
    title: "AI Clinical Consultant",
    desc: "Evidence-based differential diagnoses, treatment planning, and medication guidance — powered by cutting-edge AI trained on psychiatric literature.",
    color: "bg-teal-50 text-teal-600",
  },
  {
    icon: FileText,
    title: "Automated SOAP Notes",
    desc: "Generate fully compliant, billable SOAP notes from consultation transcripts in seconds. Supports CPT code documentation requirements.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: BookOpen,
    title: "DSM-5 & ICD-10 Reference",
    desc: "Instant access to diagnostic criteria, ICD-10 codes, and clinical protocols — right when you need them during a session.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Database,
    title: "Clinical Knowledge Base",
    desc: "Upload your own PDFs, protocols, and clinical references. The AI learns from your custom knowledge base during consultations.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Pill,
    title: "Medication Reference",
    desc: "Comprehensive psychiatric medication database with dosing, interactions, contraindications, and monitoring parameters.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: Shield,
    title: "HIPAA Certified",
    desc: "End-to-end encrypted, HIPAA-compliant infrastructure. Patient data is protected at every layer.",
    color: "bg-green-50 text-green-600",
  },
];

const stats = [
  { value: "< 30s", label: "SOAP note generation" },
  { value: "ICD-10", label: "Auto-coded diagnoses" },
  { value: "HIPAA", label: "Certified & compliant" },
  { value: "24/7", label: "AI clinical support" },
];

const workflow = [
  { step: "01", title: "Start a Consultation", desc: "Describe the clinical scenario in natural language — symptoms, history, medications, and context." },
  { step: "02", title: "Get AI-Powered Guidance", desc: "Receive evidence-based differentials, treatment options, and medication recommendations with citations." },
  { step: "03", title: "Generate the SOAP Note", desc: "Select CPT codes and generate a fully compliant, billable SOAP note from the conversation in one click." },
  { step: "04", title: "Document & Bill", desc: "Notes are automatically coded, stored securely, and ready for your EHR and billing workflow." },
];

const testimonials = [
  {
    name: "Dr. Sarah Mitchell, MD",
    role: "Psychiatrist — Private Practice",
    text: "NeuroSync has cut my documentation time in half. The SOAP notes are clinically accurate and billing-ready right out of the box.",
    stars: 5,
  },
  {
    name: "Dr. James Reyes, DO",
    role: "Child & Adolescent Psychiatry",
    text: "The DSM-5 integration and ICD-10 auto-coding alone are worth it. I use it as a second opinion on every complex case.",
    stars: 5,
  },
  {
    name: "Dr. Priya Nair, PMHNP",
    role: "Nurse Practitioner — Telehealth",
    text: "Finally an AI tool built specifically for psychiatric practice. The medication guidance is evidence-based and the HIPAA compliance gives me peace of mind.",
    stars: 5,
  },
];

export default function Landing() {
  const handleLogin = () => {
    base44.auth.redirectToLogin("/Dashboard");
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">NeuroSync</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleLogin} className="text-gray-600">
              Sign In
            </Button>
            <Button size="sm" onClick={handleLogin} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl">
              Get Started
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-xs font-semibold mb-8">
            <Shield className="w-3.5 h-3.5" />
            HIPAA Certified · End-to-End Encrypted
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
            The AI Clinical Assistant{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-teal-600">
              Built for Psychiatry
            </span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Evidence-based clinical decision support, automated SOAP note generation, and ICD-10 / CPT coding — all in one HIPAA-compliant platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={handleLogin}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-8 h-12 text-base gap-2 shadow-xl shadow-gray-900/10"
            >
              Start Free Today
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleLogin}
              className="rounded-xl px-8 h-12 text-base text-gray-600"
            >
              See a Demo
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-5">No credit card required · Free to start · Cancel anytime</p>
        </div>

        {/* Hero visual */}
        <div className="max-w-4xl mx-auto mt-16 relative">
          <div className="rounded-3xl border border-gray-100 shadow-2xl shadow-gray-200/60 overflow-hidden bg-white">
            {/* Fake browser bar */}
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <div className="flex-1 mx-4 bg-gray-100 rounded-full h-6 flex items-center px-3">
                <span className="text-xs text-gray-400">app.neurosync.ai/Consult</span>
              </div>
            </div>
            {/* Mock chat UI */}
            <div className="p-6 space-y-4 bg-gray-50/50">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-white rounded-2xl rounded-tl-md border border-gray-100 shadow-sm p-4 max-w-xl">
                  <p className="text-sm text-gray-700 leading-relaxed">I've reviewed the case. Based on the presentation — 6-week history of persistent low mood, anhedonia, psychomotor retardation, and poor sleep — the primary consideration is <strong>Major Depressive Disorder, moderate severity (F33.1)</strong>. I recommend initiating sertraline 50mg with titration to 100mg after 2 weeks, combined with CBT referral...</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <div className="bg-gray-900 text-white rounded-2xl rounded-tr-md px-4 py-3 max-w-sm">
                  <p className="text-sm leading-relaxed">Generate SOAP note with CPT 99214 + 90833</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-violet-50 border border-violet-100 rounded-2xl rounded-tl-md shadow-sm p-4 max-w-xl">
                  <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-violet-200">
                    <FileText className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">SOAP Note Generated</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed"><strong>CPT:</strong> 99214, 90833 &nbsp;|&nbsp; <strong>ICD-10:</strong> F33.1, Z63.0<br/><strong>S:</strong> Pt reports 6-week history of depressed mood, anhedonia, poor sleep 4–5 hrs/night, decreased appetite, fatigue, and difficulty concentrating at work…</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <div key={i}>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-3">Everything You Need</p>
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Built for the modern psychiatrist</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">Every tool you need to deliver better care and reduce administrative burden — in one integrated platform.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/50 transition-all group bg-white">
                <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-3">How It Works</p>
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">From consultation to billing in minutes</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflow.map((w, i) => (
              <div key={i} className="relative">
                {i < workflow.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-gray-200 to-transparent z-0" />
                )}
                <div className="relative z-10 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <span className="text-3xl font-black text-gray-100">{w.step}</span>
                  <h3 className="text-sm font-semibold text-gray-900 mt-3 mb-2">{w.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-3">Testimonials</p>
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Trusted by clinicians</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:shadow-gray-100/50 transition-all">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-5">"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-3">Pricing</p>
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Simple, transparent pricing</h2>
            <p className="text-gray-500 mt-4">Start for free, upgrade when you're ready.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Professional */}
            <div className="bg-white border-2 border-teal-500 rounded-2xl p-8 shadow-xl shadow-teal-500/10 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-teal-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">Most Popular</span>
              </div>
              <p className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-2">Professional</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black text-gray-900">$100</span>
                <span className="text-gray-400">/month</span>
              </div>
              <p className="text-xs text-gray-400 mb-6">or $249/month for expanded access</p>
              <ul className="space-y-3 mb-8">
                {["Unlimited AI consultations", "Unlimited SOAP note generation", "CPT + ICD-10 auto-coding", "Custom Knowledge Base (PDF upload)", "DSM-5 & Medication reference", "Priority support"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button onClick={handleLogin} className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-xl h-11">
                Get Started
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
            {/* Enterprise */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Enterprise</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black text-white">$1,499</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-xs text-gray-500 mb-6">For clinics and group practices</p>
              <ul className="space-y-3 mb-8">
                {["Everything in Professional", "Multi-provider access", "Dedicated onboarding", "EHR integration support", "Custom knowledge base training", "SLA & compliance documentation"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button onClick={handleLogin} variant="outline" className="w-full rounded-xl h-11 border-gray-700 text-gray-300 hover:bg-gray-800">
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-teal-500/20">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight mb-4">
            Ready to transform your practice?
          </h2>
          <p className="text-gray-500 mb-8 text-lg">Join psychiatrists and mental health providers using NeuroSync to deliver better care and reduce administrative burden.</p>
          <Button
            size="lg"
            onClick={handleLogin}
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-10 h-12 text-base gap-2 shadow-xl shadow-gray-900/10"
          >
            Start Free Today
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-xs text-gray-400 mt-4">No credit card required · HIPAA Certified</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <Stethoscope className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">NeuroSync</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5 text-teal-500" />
            HIPAA Certified · End-to-end encrypted · © 2026 NeuroSync
          </div>
          <div className="flex gap-5 text-xs text-gray-400">
            <a href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}