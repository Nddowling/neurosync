import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Copy, Download, ChevronDown, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import SOAPNoteForm from "../components/soap/SOAPNoteForm";
import SOAPNoteView from "../components/soap/SOAPNoteView";

export default function SOAPNotes() {
  const [showForm, setShowForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["clinical-notes"],
    queryFn: () => base44.entities.ClinicalNote.list("-created_date", 50),
  });

  const createNoteMutation = useMutation({
    mutationFn: async (formData) => {
      setGenerating(true);
      // Use LLM to generate SOAP note
      const prompt = `Generate a comprehensive psychiatric SOAP note based on the following information. Use proper psychiatric documentation standards including MSE in objective, risk assessment, and ICD-10 codes.

Session Type: ${formData.note_type}
Chief Complaint: ${formData.chief_complaint || "Not specified"}
Subjective Information: ${formData.subjective || "Not provided"}
Objective Findings: ${formData.objective || "Not provided"}
Current Medications: ${formData.medications || "None listed"}
Patient Demographics: ${formData.demographics || "Not specified"}
Additional Notes: ${formData.additional || "None"}

Generate the note in this JSON format with thorough, clinically appropriate content for each section.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: "claude_sonnet_4_6",
        response_json_schema: {
          type: "object",
          properties: {
            subjective: { type: "string" },
            objective: { type: "string" },
            assessment: { type: "string" },
            plan: { type: "string" },
            icd_codes: { type: "string" },
            full_note: { type: "string" }
          }
        }
      });

      const note = await base44.entities.ClinicalNote.create({
        note_type: formData.note_type || "soap",
        subjective: result.subjective,
        objective: result.objective,
        assessment: result.assessment,
        plan: result.plan,
        icd_codes: result.icd_codes,
        full_note: result.full_note,
        status: "draft"
      });

      setGenerating(false);
      return note;
    },
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ["clinical-notes"] });
      setShowForm(false);
      setSelectedNote(note);
      toast.success("SOAP note generated");
    },
    onError: () => {
      setGenerating(false);
      toast.error("Failed to generate note");
    }
  });

  const finalizeNote = async (noteId) => {
    await base44.entities.ClinicalNote.update(noteId, { status: "finalized" });
    queryClient.invalidateQueries({ queryKey: ["clinical-notes"] });
    toast.success("Note finalized");
  };

  const statusColors = {
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    finalized: "bg-teal-50 text-teal-700 border-teal-200",
    amended: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">SOAP Notes</h1>
          <p className="text-sm text-gray-400 mt-1">AI-generated clinical documentation</p>
        </div>
        <Button
          onClick={() => { setShowForm(true); setSelectedNote(null); }}
          className="bg-gray-900 hover:bg-gray-800 rounded-xl gap-2"
        >
          <Plus className="w-4 h-4" />
          Generate Note
        </Button>
      </div>

      {showForm && (
        <SOAPNoteForm
          onSubmit={(data) => createNoteMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
          isGenerating={generating}
        />
      )}

      {selectedNote && (
        <SOAPNoteView
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onFinalize={() => finalizeNote(selectedNote.id)}
        />
      )}

      {!showForm && !selectedNote && (
        <div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No notes yet. Generate your first SOAP note.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map(note => (
                <button
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className="w-full text-left flex items-center gap-4 px-5 py-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md hover:shadow-gray-100/50 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 capitalize">
                        {note.note_type?.replace(/_/g, " ")} Note
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${statusColors[note.status]}`}>
                        {note.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(note.created_date), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    {note.icd_codes && (
                      <p className="text-xs text-gray-500 mt-1 truncate">ICD: {note.icd_codes}</p>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}