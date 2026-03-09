import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Pill, Search, Loader2, AlertTriangle, BookOpen, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";

const quickQueries = [
  { label: "SSRI Comparison", query: "Compare all SSRIs: efficacy, side effect profiles, half-lives, CYP interactions, and best candidates for specific patient populations" },
  { label: "Mood Stabilizers", query: "Overview of mood stabilizers (lithium, valproate, lamotrigine, carbamazepine): indications, monitoring requirements, therapeutic levels, and key side effects" },
  { label: "Antipsychotic Metabolic Risk", query: "Rank atypical antipsychotics by metabolic risk. Include weight gain, diabetes risk, lipid effects, and recommended monitoring schedule" },
  { label: "Benzodiazepine Equivalency", query: "Benzodiazepine equivalency table with onset, duration, half-life, and taper recommendations" },
  { label: "Serotonin Syndrome", query: "Serotonin syndrome: drug combinations to avoid, symptoms by severity, diagnostic criteria, and management protocol" },
  { label: "Pregnancy Safety", query: "Psychiatric medication safety in pregnancy: categorize common medications by risk level with latest evidence" },
];

export default function Medications() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (searchQuery) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setIsLoading(true);
    setResult(null);

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a senior psychopharmacology expert. Provide a thorough, evidence-based response to this medication query. Use clinical precision with drug names, dosing ranges, CYP450 interactions, black box warnings, and monitoring parameters. Format with clear headers, bullet points, and tables where helpful. Always note safety concerns prominently.

Query: ${q}

Include:
- Mechanism of action where relevant
- Evidence level for recommendations
- Key drug-drug interactions
- Black box warnings if applicable
- Monitoring requirements
- Clinical pearls from practice`,
      model: "claude_sonnet_4_6"
    });

    setResult(response);
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Medication Reference</h1>
        <p className="text-sm text-gray-400 mt-1">Psychopharmacology reference powered by AI</p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about medications, interactions, dosing, side effects..."
            className="pl-10 rounded-xl h-11"
          />
        </div>
        <Button onClick={() => handleSearch()} disabled={isLoading || !query.trim()} className="bg-gray-900 hover:bg-gray-800 rounded-xl h-11 px-6">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {/* Quick Queries */}
      {!result && !isLoading && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Quick References</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {quickQueries.map((qq, i) => (
              <button
                key={i}
                onClick={() => { setQuery(qq.query); handleSearch(qq.query); }}
                className="text-left px-4 py-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-800">{qq.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center py-16">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin mb-4" />
          <p className="text-sm text-gray-400">Searching psychopharmacology database...</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-50">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Medication Reference</h3>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-3 h-3" />
                Verify against current formulary and guidelines
              </p>
            </div>
          </div>
          <div className="prose-clinical">
            <ReactMarkdown className="text-sm text-gray-700 leading-relaxed">
              {result}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}