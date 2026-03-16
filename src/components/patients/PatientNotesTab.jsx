import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function PatientNotesTab({ patientId }) {
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["patient_notes", patientId],
    queryFn: async () => {
      const res = await base44.functions.invoke("supabase", {
        action: "select",
        table: "patient_notes",
        query: { patient_id: patientId },
      });
      return res.data?.data || [];
    },
  });

  if (isLoading) return <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  const statusColors = { draft: "bg-amber-100 text-amber-700", finalized: "bg-green-100 text-green-700", amended: "bg-blue-100 text-blue-700" };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{notes.length} notes</p>
        <Link to="/SOAPNotes" className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium">
          <ExternalLink className="w-3.5 h-3.5" /> Generate Note
        </Link>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No SOAP notes linked to this patient yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 capitalize">{note.note_type} Note</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[note.status] || "bg-gray-100 text-gray-600"}`}>
                  {note.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{new Date(note.created_at).toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" })}</p>
              {note.icd_codes && <p className="text-xs text-gray-500">ICD-10: {note.icd_codes}</p>}
              {note.cpt_codes && <p className="text-xs text-gray-500">CPT: {note.cpt_codes}</p>}
              {note.subjective && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 border-t border-gray-50 pt-2">{note.subjective}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}