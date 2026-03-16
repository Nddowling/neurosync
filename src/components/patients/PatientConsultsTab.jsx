import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MessageSquare, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientConsultsTab({ patientId, patient }) {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["patient_sessions", patientId],
    queryFn: async () => {
      const res = await base44.functions.invoke("supabase", {
        action: "select",
        table: "patient_sessions",
        query: { patient_id: patientId },
      });
      return res.data?.data || [];
    },
  });

  if (isLoading) return <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{sessions.length} linked sessions</p>
        <Link
          to={`/Consult`}
          className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          <ExternalLink className="w-3.5 h-3.5" /> New Consult
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No consults linked to this patient yet.</p>
          <p className="text-xs text-gray-300 mt-1">After a consult, link it from the session details.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">{s.chief_complaint || "Consult"}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{s.session_type?.replace("_", " ")} · {new Date(s.session_date).toLocaleDateString()}</p>
                </div>
                {s.base44_conversation_id && (
                  <Link to={`/Consult?sessionId=${s.base44_session_id}`} className="text-xs text-teal-600 hover:underline">
                    View →
                  </Link>
                )}
              </div>
              {s.notes && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{s.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}