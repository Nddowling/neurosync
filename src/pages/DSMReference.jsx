import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpen, Search, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";

const dsmCategories = [
  { label: "Depressive Disorders", query: "DSM-5-TR diagnostic criteria for Major Depressive Disorder, Persistent Depressive Disorder, and Disruptive Mood Dysregulation Disorder. Include specifiers." },
  { label: "Anxiety Disorders", query: "DSM-5-TR diagnostic criteria for Generalized Anxiety Disorder, Panic Disorder, Social Anxiety Disorder, and Specific Phobia. Include differential diagnosis tips." },
  { label: "Bipolar Disorders", query: "DSM-5-TR diagnostic criteria for Bipolar I, Bipolar II, and Cyclothymic Disorder. Include mania vs hypomania distinction and specifiers." },
  { label: "Schizophrenia Spectrum", query: "DSM-5-TR diagnostic criteria for Schizophrenia, Schizoaffective Disorder, Brief Psychotic Disorder, and Delusional Disorder. Include duration requirements." },
  { label: "Trauma & Stressor-Related", query: "DSM-5-TR criteria for PTSD, Acute Stress Disorder, and Adjustment Disorders. Include the 4 PTSD symptom clusters." },
  { label: "OCD & Related", query: "DSM-5-TR criteria for OCD, Body Dysmorphic Disorder, Hoarding Disorder, Trichotillomania, and Excoriation Disorder." },
  { label: "Personality Disorders", query: "DSM-5-TR diagnostic criteria for all Cluster A, B, and C personality disorders. Include general personality disorder criteria." },
  { label: "ADHD", query: "DSM-5-TR diagnostic criteria for ADHD including all presentations, age-adjusted criteria for adults, and common differential diagnoses." },
  { label: "Substance Use Disorders", query: "DSM-5-TR diagnostic criteria for Substance Use Disorders including severity levels, and criteria for specific substances (alcohol, opioids, cannabis, stimulants)." },
  { label: "Eating Disorders", query: "DSM-5-TR diagnostic criteria for Anorexia Nervosa, Bulimia Nervosa, Binge Eating Disorder, and ARFID. Include severity specifiers." },
  { label: "Neurocognitive Disorders", query: "DSM-5-TR criteria for Major and Mild Neurocognitive Disorder, including etiological subtypes (Alzheimer's, Vascular, Lewy Body, Frontotemporal)." },
  { label: "Sleep-Wake Disorders", query: "DSM-5-TR criteria for Insomnia Disorder, Hypersomnolence Disorder, and Narcolepsy. Include psychiatric comorbidity considerations." },
];

export default function DSMReference() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  const handleSearch = async (searchQuery) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a psychiatry professor and DSM-5-TR expert. Provide comprehensive diagnostic information for this query. Be thorough and clinically precise.

Query: ${q}

Structure your response with:
1. **Diagnostic Criteria** — List all criteria (A, B, C, etc.) exactly as they appear in DSM-5-TR
2. **Specifiers** — All relevant specifiers and subtypes
3. **Key Differential Diagnoses** — How to distinguish from similar conditions
4. **Clinical Pearls** — Practical diagnostic tips
5. **Common Comorbidities** — Frequently co-occurring conditions
6. **Assessment Tools** — Validated scales/instruments for screening and monitoring

Use clear formatting with headers and bullet points.`,
    });

    setResult(response);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">DSM-5 Reference</h1>
        <p className="text-sm text-gray-400 mt-1">Diagnostic criteria and clinical guidance</p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search disorders, criteria, differential diagnosis..."
            className="pl-10 rounded-xl h-11"
          />
        </div>
        <Button onClick={() => handleSearch()} disabled={isLoading || !query.trim()} className="bg-gray-900 hover:bg-gray-800 rounded-xl h-11 px-6">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {/* Categories Grid */}
      {!result && !isLoading && (
        <div>
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Diagnostic Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {dsmCategories.map((cat, i) => (
              <button
                key={i}
                onClick={() => { setQuery(cat.label); setActiveCategory(cat.label); handleSearch(cat.query); }}
                className="group text-left flex items-center justify-between px-4 py-3.5 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{cat.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center py-16">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin mb-4" />
          <p className="text-sm text-gray-400">Searching diagnostic database...</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div>
          <Button variant="ghost" onClick={() => setResult(null)} className="mb-4 text-sm text-gray-500 hover:text-gray-700 gap-1 -ml-2">
            ← Back to categories
          </Button>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-50">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{activeCategory || "Search Results"}</h3>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <AlertCircle className="w-3 h-3" />
                  Reference only — confirm with current DSM-5-TR text
                </p>
              </div>
            </div>
            <div className="prose-clinical">
              <ReactMarkdown className="text-sm text-gray-700 leading-relaxed">
                {result}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}