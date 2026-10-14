import { toast } from "sonner";
import React, { useState } from "react";
import { neurosync } from "@/api/client";
import { BookOpen, Search, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import ClinicalWarningBanner from "@/components/legal/ClinicalWarningBanner";

const dsmCategories = [
  { label: "Depressive Disorders", query: "DSM-5 diagnostic overview for Major Depressive Disorder, Persistent Depressive Disorder, and Disruptive Mood Dysregulation Disorder. Include specifiers." },
  { label: "Anxiety Disorders", query: "DSM-5 diagnostic overview for Generalized Anxiety Disorder, Panic Disorder, Social Anxiety Disorder, and Specific Phobia. Include differential diagnosis tips." },
  { label: "Bipolar Disorders", query: "DSM-5 diagnostic overview for Bipolar I, Bipolar II, and Cyclothymic Disorder. Include mania vs hypomania distinction and specifiers." },
  { label: "Schizophrenia Spectrum", query: "DSM-5 diagnostic overview for Schizophrenia, Schizoaffective Disorder, Brief Psychotic Disorder, and Delusional Disorder. Include duration requirements." },
  { label: "Trauma & Stressor-Related", query: "DSM-5 diagnostic overview for PTSD, Acute Stress Disorder, and Adjustment Disorders. Include the 4 PTSD symptom clusters." },
  { label: "OCD & Related", query: "DSM-5 diagnostic overview for OCD, Body Dysmorphic Disorder, Hoarding Disorder, Trichotillomania, and Excoriation Disorder." },
  { label: "Personality Disorders", query: "DSM-5 diagnostic overview for all Cluster A, B, and C personality disorders. Include general personality disorder criteria." },
  { label: "ADHD", query: "DSM-5 diagnostic overview for ADHD including all presentations, age-adjusted criteria for adults, and common differential diagnoses." },
  { label: "Substance Use Disorders", query: "DSM-5 diagnostic overview for Substance Use Disorders including severity levels, and criteria for specific substances (alcohol, opioids, cannabis, stimulants)." },
  { label: "Eating Disorders", query: "DSM-5 diagnostic overview for Anorexia Nervosa, Bulimia Nervosa, Binge Eating Disorder, and ARFID. Include severity specifiers." },
  { label: "Neurocognitive Disorders", query: "DSM-5 diagnostic overview for Major and Mild Neurocognitive Disorder, including etiological subtypes (Alzheimer's, Vascular, Lewy Body, Frontotemporal)." },
  { label: "Sleep-Wake Disorders", query: "DSM-5 diagnostic overview for Insomnia Disorder, Hypersomnolence Disorder, and Narcolepsy. Include psychiatric comorbidity considerations." },
];

export default function DSMReference() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [sources,setSources]=useState(/** @type {{sourceId:string,title:string,fileUrl:string|null}[]} */ ([]));

  const handleSearch = async (searchQuery) => {
    const q = searchQuery || query;
    if (!q.trim() || isLoading) return;

    setIsLoading(true);
    setResult(null);
    setSources([]);

    try {
      const response = await neurosync.ai.diagnostic(q);
      setResult(response.content);
      setSources(response.sources);
    } catch (error) {
      toast.error(error.message || "Reference lookup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">DSM-5 Reference</h1>
        <p className="text-sm text-gray-400 mt-1">Diagnostic summaries using your private Knowledge Base when relevant sources are available.</p>
      </div>
      <ClinicalWarningBanner variant="decision-support" className="mb-6" />

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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-50">
            <div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-1/3" />
              <div className="h-3 bg-gray-100 rounded-full animate-pulse w-1/4" />
            </div>
          </div>
          <div className="space-y-3">
            {[1,0.9,0.7,1,0.8,0.6,1,0.75].map((w, i) => (
              <div key={i} className="h-3 bg-gray-100 rounded-full animate-pulse" style={{ width: `${w * 100}%`, animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-5 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Generating diagnostic reference...
          </p>
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
                  Verify the cited edition; DSM-5 (2013) is not DSM-5-TR.
                </p>
              </div>
            </div>
            <div className="mb-4 rounded-lg bg-slate-50 p-3 text-xs text-gray-600">
              {sources.length ? <><p className="font-semibold mb-2">Retrieved from your Knowledge Base</p><ul className="space-y-1">{[...new Map(sources.map(source=>[source.sourceId,source])).values()].map(source=><li key={source.sourceId}><a className="underline" href={source.fileUrl || "/KnowledgeBase"} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul></> : <p>No matching private reference was retrieved. This is a general AI response.</p>}
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