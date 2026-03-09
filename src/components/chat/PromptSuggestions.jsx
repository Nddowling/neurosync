import React from "react";
import { Zap } from "lucide-react";

const suggestions = [
  {
    label: "Differential Diagnosis",
    prompt: "Patient presents with persistent depressed mood, anhedonia, insomnia, and weight loss for 3 weeks. PMH includes hypothyroidism. What are the top differential diagnoses and recommended workup?"
  },
  {
    label: "Treatment Algorithm",
    prompt: "First-line treatment recommendations for treatment-resistant depression in a 45-year-old male who has failed 2 adequate SSRI trials. Include augmentation strategies."
  },
  {
    label: "Drug Interaction Check",
    prompt: "Check for interactions and concerns: Patient on lithium 900mg, lamotrigine 200mg, and starting sertraline. Also on lisinopril and metformin."
  },
  {
    label: "Crisis Assessment",
    prompt: "Patient expressing passive suicidal ideation without plan. Risk and protective factors assessment framework, and recommended safety planning steps."
  },
];

export default function PromptSuggestions({ onSelect }) {
  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-teal-500" />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Quick Start</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s.prompt)}
            className="text-left px-4 py-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm transition-all duration-200 group"
          >
            <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{s.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  );
}