import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CPT_CODES = [
  // Evaluation & Management
  { code: "99202", desc: "Office visit – New patient, straightforward (20-29 min)" },
  { code: "99203", desc: "Office visit – New patient, low complexity (30-44 min)" },
  { code: "99204", desc: "Office visit – New patient, moderate complexity (45-59 min)" },
  { code: "99205", desc: "Office visit – New patient, high complexity (60-74 min)" },
  { code: "99211", desc: "Office visit – Established, minimal (nurse visit)" },
  { code: "99212", desc: "Office visit – Established, straightforward (10-19 min)" },
  { code: "99213", desc: "Office visit – Established, low complexity (20-29 min)" },
  { code: "99214", desc: "Office visit – Established, moderate complexity (30-39 min)" },
  { code: "99215", desc: "Office visit – Established, high complexity (40-54 min)" },
  // Psychotherapy
  { code: "90832", desc: "Psychotherapy, 16-37 min" },
  { code: "90834", desc: "Psychotherapy, 38-52 min" },
  { code: "90837", desc: "Psychotherapy, 53+ min" },
  { code: "90839", desc: "Psychotherapy for crisis, first 60 min" },
  { code: "90840", desc: "Psychotherapy for crisis, each additional 30 min" },
  { code: "90845", desc: "Psychoanalysis" },
  { code: "90847", desc: "Family psychotherapy with patient, 50 min" },
  { code: "90849", desc: "Multiple-family group psychotherapy" },
  { code: "90853", desc: "Group psychotherapy (non-family)" },
  // Add-on psychotherapy with E&M
  { code: "90833", desc: "Psychotherapy add-on with E&M, 16-37 min" },
  { code: "90836", desc: "Psychotherapy add-on with E&M, 38-52 min" },
  { code: "90838", desc: "Psychotherapy add-on with E&M, 53+ min" },
  // Psychiatric E&M
  { code: "90792", desc: "Psychiatric diagnostic evaluation with medical services" },
  { code: "90791", desc: "Psychiatric diagnostic evaluation (no medical services)" },
  // Medication management
  { code: "99223", desc: "Initial hospital care, high complexity" },
  { code: "99232", desc: "Subsequent hospital care, moderate complexity" },
  { code: "99233", desc: "Subsequent hospital care, high complexity" },
  // Telehealth
  { code: "99421", desc: "Online digital E&M, 5-10 min" },
  { code: "99422", desc: "Online digital E&M, 11-20 min" },
  { code: "99423", desc: "Online digital E&M, 21+ min" },
];

export default function CptCodeSelect({ value, onChange }) {
  const matched = CPT_CODES.find(c => c.code === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="rounded-xl">
        <SelectValue placeholder="Select CPT code…">
          {matched ? (
            <span>
              <span className="font-mono font-semibold">{matched.code}</span>
              <span className="text-gray-400 ml-2 text-xs hidden sm:inline">— {matched.desc}</span>
            </span>
          ) : value ? (
            <span className="font-mono">{value}</span>
          ) : (
            "Select CPT code…"
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {CPT_CODES.map(item => (
          <SelectItem key={item.code} value={item.code}>
            <span className="font-mono font-semibold text-teal-700">{item.code}</span>
            <span className="text-gray-500 ml-2 text-xs">{item.desc}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}