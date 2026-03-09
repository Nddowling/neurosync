import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, CheckCircle2, Printer } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

const sections = [
  { key: "subjective", label: "Subjective", color: "border-l-blue-400 bg-blue-50/30" },
  { key: "objective", label: "Objective", color: "border-l-teal-400 bg-teal-50/30" },
  { key: "assessment", label: "Assessment", color: "border-l-violet-400 bg-violet-50/30" },
  { key: "plan", label: "Plan", color: "border-l-amber-400 bg-amber-50/30" },
];

export default function SOAPNoteView({ note, onClose, onFinalize }) {
  const copyToClipboard = () => {
    const text = sections
      .map(s => `${s.label.toUpperCase()}:\n${note[s.key] || "N/A"}`)
      .join("\n\n") + (note.icd_codes ? `\n\nICD-10 CODES: ${note.icd_codes}` : "");
    navigator.clipboard.writeText(text);
    toast.success("Note copied to clipboard");
  };

  const handlePrint = () => {
    window.print();
  };

  const statusColors = {
    draft: "bg-amber-50 text-amber-700",
    finalized: "bg-teal-50 text-teal-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 overflow-hidden mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 capitalize">{note.note_type?.replace(/_/g, " ")} Note</h3>
              <Badge className={`text-[10px] ${statusColors[note.status]}`}>{note.status}</Badge>
            </div>
            <p className="text-xs text-gray-400">{format(new Date(note.created_date), "MMM d, yyyy 'at' h:mm a")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs h-8" onClick={copyToClipboard}>
            <Copy className="w-3.5 h-3.5" /> Copy
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs h-8" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          {note.status === "draft" && (
            <Button size="sm" className="rounded-xl gap-1.5 text-xs h-8 bg-teal-600 hover:bg-teal-700" onClick={onFinalize}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Finalize
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {sections.map(({ key, label, color }) => (
          note[key] && (
            <div key={key} className={`border-l-4 rounded-r-xl p-4 ${color}`}>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</h4>
              <div className="text-sm text-gray-700 leading-relaxed prose-clinical">
                <ReactMarkdown>{note[key]}</ReactMarkdown>
              </div>
            </div>
          )
        ))}

        {note.icd_codes && (
          <div className="border border-gray-100 rounded-xl p-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">ICD-10 Codes</h4>
            <p className="text-sm text-gray-700 font-mono">{note.icd_codes}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}