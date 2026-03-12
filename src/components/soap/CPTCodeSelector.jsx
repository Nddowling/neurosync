import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Search, X, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_CODES = [
  {
    group: "E&M — Established Patient (Outpatient)",
    codes: [
      { code: "99212", label: "Brief visit (10–19 min)", description: "Straightforward medical decision-making" },
      { code: "99213", label: "Low complexity (20–29 min)", description: "Low medical decision-making — brief med check" },
      { code: "99214", label: "Moderate complexity (30–39 min)", description: "Moderate MDM — most common for medication management" },
      { code: "99215", label: "High complexity (40–54 min)", description: "High MDM — complex psychiatric presentations" },
    ],
  },
  {
    group: "Psychotherapy Add-On (append to E&M code)",
    codes: [
      { code: "90833", label: "+30 min psychotherapy", description: "Add to E&M — e.g. 99214 + 90833 for med mgmt + therapy" },
      { code: "90836", label: "+45 min psychotherapy", description: "Add to E&M — combined visit with extended therapy" },
      { code: "90838", label: "+60 min psychotherapy", description: "Add to E&M — combined visit with full therapy session" },
    ],
  },
  {
    group: "Standalone Psychotherapy",
    codes: [
      { code: "90832", label: "Individual therapy 30 min", description: "Standalone psychotherapy — no E&M component" },
      { code: "90834", label: "Individual therapy 45 min", description: "Standalone psychotherapy" },
      { code: "90837", label: "Individual therapy 60 min", description: "Standalone psychotherapy — most common standalone code" },
      { code: "90839", label: "Crisis psychotherapy (30–74 min)", description: "Psychiatric crisis intervention" },
      { code: "90847", label: "Family therapy w/ patient", description: "Family therapy including identified patient" },
    ],
  },
  {
    group: "Psychological Testing",
    codes: [
      { code: "96130", label: "Psych testing evaluation (first hr)", description: "Clinician-administered and interpreted" },
      { code: "96131", label: "Psych testing (each add'l hr)", description: "Add-on to 96130" },
      { code: "96136", label: "Test administration (first 30 min)", description: "Tech or computer administered" },
      { code: "96137", label: "Test administration (add'l 30 min)", description: "Add-on to 96136" },
    ],
  },
];

export default function CPTCodeSelector({ open, onClose, onGenerate, isGenerating }) {
  const [selected, setSelected] = useState([]);
  const [customCode, setCustomCode] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [isLooking, setIsLooking] = useState(false);

  const toggleCode = (codeObj) => {
    setSelected(prev =>
      prev.find(c => c.code === codeObj.code)
        ? prev.filter(c => c.code !== codeObj.code)
        : [...prev, codeObj]
    );
  };

  const handleLookup = async () => {
    if (!customCode.trim()) return;
    setIsLooking(true);
    setLookupResult(null);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Describe CPT code ${customCode.trim()} for a psychiatry/mental health/behavioral health billing context. Provide: the official code name, what type of clinical encounter it represents, documentation requirements, and typical session type. Be concise (2-3 sentences max).`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
    });
    setLookupResult({ code: customCode.trim(), label: result.split(".")[0].substring(0, 60), description: result });
    setIsLooking(false);
  };

  const addCustom = () => {
    if (!lookupResult) return;
    if (!selected.find(c => c.code === lookupResult.code)) {
      setSelected(prev => [...prev, lookupResult]);
    }
    setCustomCode("");
    setLookupResult(null);
  };

  const handleGenerate = () => {
    onGenerate(selected);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-violet-500" />
            Select Billing Codes for SOAP Note
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            The SOAP note structure and documentation will be tailored to the selected CPT code(s). You can combine E&M + add-on codes.
          </p>
        </DialogHeader>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 px-6 py-3 border-b border-gray-100 bg-violet-50/50">
            <span className="text-xs text-gray-400 self-center mr-1">Selected:</span>
            {selected.map(c => (
              <Badge key={c.code} className="bg-violet-100 text-violet-700 border border-violet-200 gap-1 pl-2 pr-1 py-1">
                <span className="font-mono font-semibold">{c.code}</span>
                <button onClick={() => toggleCode(c)} className="ml-1 hover:text-violet-900 rounded">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Scrollable code list */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-5">
          {PRESET_CODES.map(group => (
            <div key={group.group}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{group.group}</p>
              <div className="space-y-1.5">
                {group.codes.map(c => {
                  const isSelected = !!selected.find(s => s.code === c.code);
                  return (
                    <button
                      key={c.code}
                      onClick={() => toggleCode(c)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl border transition-all",
                        isSelected
                          ? "bg-violet-50 border-violet-200"
                          : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={cn("text-sm font-bold font-mono", isSelected ? "text-violet-700" : "text-gray-700")}>{c.code}</span>
                          <span className={cn("text-sm", isSelected ? "text-violet-800" : "text-gray-600")}>{c.label}</span>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 ml-0">{c.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Custom code lookup */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Custom / Unlisted Code</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter CPT code (e.g. 90853)"
                value={customCode}
                onChange={e => setCustomCode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLookup()}
                className="font-mono"
              />
              <Button
                variant="outline"
                onClick={handleLookup}
                disabled={!customCode.trim() || isLooking}
                className="flex-shrink-0 gap-1.5"
              >
                {isLooking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {!isLooking && "Look Up"}
              </Button>
            </div>
            {lookupResult && (
              <div className="mt-2 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-blue-900 font-mono">{lookupResult.code}</p>
                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">{lookupResult.description}</p>
                  </div>
                  <Button size="sm" onClick={addCustom} className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0">
                    Add Code
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400">
            {selected.length === 0
              ? "No codes selected — AI will auto-detect session type"
              : `${selected.length} code${selected.length !== 1 ? "s" : ""} selected — SOAP note will match this billing structure`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isGenerating}>Cancel</Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {isGenerating ? "Generating..." : "Generate SOAP Note"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}