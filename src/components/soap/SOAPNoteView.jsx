import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, CheckCircle2, Printer, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

const mdComponents = {
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  th: ({ children }) => (
    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide border border-gray-200">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-sm text-gray-700 border border-gray-200 align-top leading-relaxed">
      {children}
    </td>
  ),
  tr: ({ children }) => <tr className="even:bg-gray-50/50">{children}</tr>,
  p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc ml-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal ml-5 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-800 mt-3 mb-1">{children}</h3>,
  h4: ({ children }) => <h4 className="text-xs font-semibold text-gray-700 mt-2 mb-1 uppercase tracking-wide">{children}</h4>,
};

const Section = ({ letter, title, color, borderColor, children }) => (
  <div className={`rounded-xl border ${borderColor} ${color} overflow-hidden`}>
    <div className={`px-5 py-3 border-b ${borderColor} flex items-center gap-3`}>
      <span className="text-base font-bold text-gray-800">{letter} —</span>
      <span className="text-sm font-bold text-gray-700 uppercase tracking-widest">{title}</span>
    </div>
    <div className="px-5 py-4 text-sm text-gray-700 leading-relaxed">
      {children}
    </div>
  </div>
);

export default function SOAPNoteView({ note, onClose, onFinalize }) {
  const copyToClipboard = () => {
    const parts = [
      `PSYCHIATRIC SOAP NOTE`,
      `Date: ${format(new Date(note.created_date), "MMMM d, yyyy")}`,
      note.provider_name ? `Provider: ${note.provider_name}` : "",
      note.patient_info ? `Patient: ${note.patient_info}` : "",
      "",
      `S — SUBJECTIVE\n${note.subjective || ""}`,
      `\nO — OBJECTIVE\n${note.objective || ""}`,
      `\nA — ASSESSMENT\n${note.assessment || ""}`,
      note.risk_assessment ? `\nRISK ASSESSMENT\n${note.risk_assessment}` : "",
      `\nP — PLAN\n${note.plan || ""}`,
      note.icd_codes ? `\nICD-10 CODES: ${note.icd_codes}` : "",
    ].filter(Boolean).join("\n");

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(parts).then(() => {
        toast.success("Note copied to clipboard");
      }).catch(() => fallbackCopy(parts));
    } else {
      fallbackCopy(parts);
    }
  };

  const fallbackCopy = (text) => {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    try {
      document.execCommand("copy");
      toast.success("Note copied to clipboard");
    } catch {
      toast.error("Copy failed — please select and copy manually");
    }
    document.body.removeChild(el);
  };

  const statusColors = {
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    finalized: "bg-teal-50 text-teal-700 border-teal-200",
    amended: "bg-blue-50 text-blue-700 border-blue-200",
  };

  const noteTypeLabel = {
    soap: "SOAP Note",
    progress: "Progress Note",
    intake: "Intake Note",
    medication_change: "Medication Change Note",
    discharge: "Discharge Note",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 overflow-hidden mb-6"
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{noteTypeLabel[note.note_type] || "Clinical Note"}</h3>
              <Badge variant="outline" className={`text-[10px] ${statusColors[note.status]}`}>{note.status}</Badge>
            </div>
            <p className="text-xs text-gray-400">{format(new Date(note.created_date), "MMM d, yyyy 'at' h:mm a")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs h-8" onClick={copyToClipboard}>
            <Copy className="w-3.5 h-3.5" /> Copy
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs h-8" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          {note.status === "draft" && (
            <Button size="sm" className="rounded-xl gap-1.5 text-xs h-8 bg-teal-600 hover:bg-teal-700" onClick={onFinalize}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Finalize
            </Button>
          )}
        </div>
      </div>

      {/* Document body */}
      <div className="p-6 space-y-5 max-w-4xl mx-auto">
        {/* Document Header */}
        <div className="rounded-xl bg-gray-900 text-white p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-teal-400" />
            </div>
            <h2 className="text-base font-bold tracking-wider uppercase">Psychiatric SOAP Note</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-gray-400 w-28 flex-shrink-0">Date:</span>
              <span className="text-gray-100">{format(new Date(note.created_date), "MMMM d, yyyy")}</span>
            </div>
            {note.session_duration && (
              <div className="flex gap-2">
                <span className="text-gray-400 w-28 flex-shrink-0">Session Type:</span>
                <span className="text-gray-100">{noteTypeLabel[note.note_type]} ({note.session_duration} min)</span>
              </div>
            )}
            {note.provider_name && (
              <div className="flex gap-2">
                <span className="text-gray-400 w-28 flex-shrink-0">Provider:</span>
                <span className="text-gray-100">{note.provider_name}</span>
              </div>
            )}
            {note.patient_info && (
              <div className="flex gap-2">
                <span className="text-gray-400 w-28 flex-shrink-0">Patient:</span>
                <span className="text-gray-100">{note.patient_info}</span>
              </div>
            )}
          </div>
        </div>

        {/* S — Subjective */}
        {note.subjective && (
          <Section letter="S" title="Subjective" color="bg-blue-50/40" borderColor="border-blue-200">
            <ReactMarkdown components={mdComponents}>{note.subjective}</ReactMarkdown>
          </Section>
        )}

        {/* O — Objective */}
        {note.objective && (
          <Section letter="O" title="Objective" color="bg-teal-50/40" borderColor="border-teal-200">
            <ReactMarkdown components={mdComponents}>{note.objective}</ReactMarkdown>
          </Section>
        )}

        {/* A — Assessment */}
        {note.assessment && (
          <Section letter="A" title="Assessment" color="bg-violet-50/40" borderColor="border-violet-200">
            <ReactMarkdown components={mdComponents}>{note.assessment}</ReactMarkdown>
          </Section>
        )}

        {/* Risk Assessment */}
        {note.risk_assessment && (
          <div className="rounded-xl border border-red-200 bg-red-50/30 overflow-hidden">
            <div className="px-5 py-3 border-b border-red-200 flex items-center gap-2 bg-red-50/60">
              <span className="text-sm font-bold text-red-800 uppercase tracking-widest">Risk Assessment</span>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700">
              <ReactMarkdown components={mdComponents}>{note.risk_assessment}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* P — Plan */}
        {note.plan && (
          <Section letter="P" title="Plan" color="bg-amber-50/40" borderColor="border-amber-200">
            <ReactMarkdown components={mdComponents}>{note.plan}</ReactMarkdown>
          </Section>
        )}

        {/* Footer */}
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-gray-500">
            {note.provider_name && (
              <div>
                <span className="font-semibold text-gray-700">Electronically signed:</span> {note.provider_name}
              </div>
            )}
            {note.session_duration && (
              <div>
                <span className="font-semibold text-gray-700">Time spent:</span> {note.session_duration} minutes
              </div>
            )}
            {note.cpt_code && (
              <div>
                <span className="font-semibold text-gray-700">CPT Code:</span> {note.cpt_code}
              </div>
            )}
            <div>
              <span className="font-semibold text-gray-700">Status:</span>{" "}
              <span className="capitalize">{note.status}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}