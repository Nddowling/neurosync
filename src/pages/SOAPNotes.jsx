import React, { useState } from "react";
import { neurosync } from "@/api/client";
import ClinicalWarningBanner from "@/components/legal/ClinicalWarningBanner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, ChevronDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
    queryFn: async () => {
      let allNotes = [];
      let skip = 0;
      const limit = 100;
      let hasMore = true;
      while (hasMore) {
        const batch = await neurosync.entities.ClinicalNote.list("-created_date", limit, skip);
        if (!batch || batch.length === 0) {
          hasMore = false;
        } else {
          allNotes = allNotes.concat(batch);
          skip += limit;
          if (batch.length < limit) hasMore = false;
        }
      }
      return allNotes;
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (/** @type {Record<string,string>} */ formData) => {
      setGenerating(true);
      try { return await neurosync.ai.soap({form: formData, codes: (formData.cpt_code || '').split(',').map(code=>code.trim()).filter(Boolean).map(code=>({code})), request_id: crypto.randomUUID()}); }
      finally { setGenerating(false); }
    },
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ["clinical-notes"] });
      setShowForm(false);
      setSelectedNote(note);
      toast.success("SOAP note generated and saved");
    },
    onError: () => {
      setGenerating(false);
      toast.error("Failed to generate note");
    }
  });

  const finalizeNote = async (noteId) => {
    await neurosync.entities.ClinicalNote.update(noteId, { status: "finalized" });
    queryClient.invalidateQueries({ queryKey: ["clinical-notes"] });
    setSelectedNote(prev => prev ? { ...prev, status: "finalized" } : prev);
    toast.success("Note finalized");
  };

  // Load full clinical content from the clinical database when a note is selected
  const handleSelectNote = async (note) => {
    setSelectedNote(note);
  };

  const statusColors = {
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    finalized: "bg-teal-50 text-teal-700 border-teal-200",
    amended: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <ClinicalWarningBanner variant="soap-draft" className="mb-6" />
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
                 onClick={() => handleSelectNote(note)}
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
                      {new Date(note.created_date).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: undefined, timeZone: "America/New_York" })}
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