import React, { useState, useRef, useEffect } from "react";
import { X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// Most common psychiatric & related ICD-10 codes
const ICD_CODES = [
  { code: "F32.0", desc: "Major depressive disorder, single episode, mild" },
  { code: "F32.1", desc: "Major depressive disorder, single episode, moderate" },
  { code: "F32.2", desc: "Major depressive disorder, single episode, severe without psychotic features" },
  { code: "F32.3", desc: "Major depressive disorder, single episode, with psychotic features" },
  { code: "F33.0", desc: "Major depressive disorder, recurrent, mild" },
  { code: "F33.1", desc: "Major depressive disorder, recurrent, moderate" },
  { code: "F33.2", desc: "Major depressive disorder, recurrent, severe without psychotic features" },
  { code: "F33.3", desc: "Major depressive disorder, recurrent, with psychotic features" },
  { code: "F41.0", desc: "Panic disorder without agoraphobia" },
  { code: "F41.1", desc: "Generalized anxiety disorder (GAD)" },
  { code: "F41.9", desc: "Anxiety disorder, unspecified" },
  { code: "F40.10", desc: "Social anxiety disorder, unspecified" },
  { code: "F40.00", desc: "Agoraphobia, unspecified" },
  { code: "F42.2", desc: "Obsessive-compulsive disorder (OCD), mixed" },
  { code: "F43.10", desc: "PTSD, unspecified" },
  { code: "F43.11", desc: "PTSD, acute" },
  { code: "F43.12", desc: "PTSD, chronic" },
  { code: "F43.20", desc: "Adjustment disorder, unspecified" },
  { code: "F43.21", desc: "Adjustment disorder with depressed mood" },
  { code: "F43.22", desc: "Adjustment disorder with anxiety" },
  { code: "F43.23", desc: "Adjustment disorder with mixed anxiety and depressed mood" },
  { code: "F31.0", desc: "Bipolar disorder, current episode hypomanic" },
  { code: "F31.10", desc: "Bipolar I disorder, current episode manic, unspecified" },
  { code: "F31.30", desc: "Bipolar I disorder, current episode depressed, unspecified" },
  { code: "F31.81", desc: "Bipolar II disorder" },
  { code: "F31.9", desc: "Bipolar disorder, unspecified" },
  { code: "F20.9", desc: "Schizophrenia, unspecified" },
  { code: "F25.0", desc: "Schizoaffective disorder, bipolar type" },
  { code: "F25.1", desc: "Schizoaffective disorder, depressive type" },
  { code: "F90.0", desc: "ADHD, predominantly inattentive type" },
  { code: "F90.1", desc: "ADHD, predominantly hyperactive-impulsive type" },
  { code: "F90.2", desc: "ADHD, combined presentation" },
  { code: "F84.0", desc: "Autism spectrum disorder (ASD)" },
  { code: "F60.3", desc: "Borderline personality disorder (BPD)" },
  { code: "F60.0", desc: "Paranoid personality disorder" },
  { code: "F60.1", desc: "Schizoid personality disorder" },
  { code: "F60.2", desc: "Antisocial personality disorder" },
  { code: "F60.4", desc: "Histrionic personality disorder" },
  { code: "F60.5", desc: "Obsessive-compulsive personality disorder" },
  { code: "F60.6", desc: "Avoidant personality disorder" },
  { code: "F60.7", desc: "Dependent personality disorder" },
  { code: "F50.00", desc: "Anorexia nervosa, unspecified" },
  { code: "F50.2", desc: "Bulimia nervosa" },
  { code: "F10.10", desc: "Alcohol use disorder, mild" },
  { code: "F10.20", desc: "Alcohol use disorder, moderate" },
  { code: "F10.21", desc: "Alcohol use disorder, severe" },
  { code: "F11.10", desc: "Opioid use disorder, mild" },
  { code: "F12.10", desc: "Cannabis use disorder, mild" },
  { code: "F14.10", desc: "Cocaine use disorder, mild" },
  { code: "F17.210", desc: "Nicotine dependence, cigarettes, uncomplicated" },
  { code: "G47.00", desc: "Insomnia, unspecified" },
  { code: "G47.30", desc: "Sleep apnea, unspecified" },
  { code: "F51.01", desc: "Primary insomnia" },
  { code: "R45.851", desc: "Suicidal ideation" },
  { code: "Z87.39", desc: "Personal history of other mental and behavioral disorders" },
  { code: "Z63.0", desc: "Problems in relationship with spouse or partner" },
  { code: "Z63.4", desc: "Disappearance or death of family member" },
  { code: "Z55.9", desc: "Problems related to education, unspecified" },
  { code: "Z56.9", desc: "Problems related to employment, unspecified" },
  { code: "Z59.9", desc: "Problems related to housing, unspecified" },
  { code: "Z91.19", desc: "Patient's noncompliance with medical treatment" },
];

export default function IcdCodeInput({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Parse current selected codes from the comma-separated value
  const selectedCodes = value
    ? value.split(",").map(c => c.trim()).filter(Boolean)
    : [];

  const filtered = query.length >= 1
    ? ICD_CODES.filter(
        item =>
          !selectedCodes.includes(item.code) &&
          (item.code.toLowerCase().includes(query.toLowerCase()) ||
            item.desc.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 8)
    : [];

  const addCode = (code) => {
    const newCodes = [...selectedCodes, code];
    onChange(newCodes.join(", "));
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeCode = (code) => {
    const newCodes = selectedCodes.filter(c => c !== code);
    onChange(newCodes.join(", "));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-2">
      {/* Selected codes chips */}
      {selectedCodes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCodes.map(code => {
            const meta = ICD_CODES.find(i => i.code === code);
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-100 text-xs font-medium text-violet-700"
              >
                <span className="font-mono">{code}</span>
                {meta && <span className="text-violet-500 hidden sm:inline truncate max-w-[140px]">— {meta.desc}</span>}
                <button
                  type="button"
                  onClick={() => removeCode(code)}
                  className="ml-0.5 text-violet-400 hover:text-violet-700 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query.length >= 1 && setOpen(true)}
          placeholder="Type ICD-10 code or diagnosis (e.g. F33.1 or depression)…"
          className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />

        {open && filtered.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden"
          >
            {filtered.map(item => (
              <button
                key={item.code}
                type="button"
                onMouseDown={() => addCode(item.code)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-mono text-xs font-semibold text-violet-600 flex-shrink-0">{item.code}</span>
                <span className="text-xs text-gray-600 truncate">{item.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}