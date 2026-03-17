import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import ClinicalWarningBanner from "@/components/legal/ClinicalWarningBanner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Copy, Download, ChevronDown, Clock, CheckCircle2, Loader2 } from "lucide-react";
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
        const batch = await base44.entities.ClinicalNote.list("-created_date", limit, skip);
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
    mutationFn: async (formData) => {
      setGenerating(true);
      const prompt = `You are a board-certified psychiatrist generating a formal psychiatric SOAP note for an EHR. Output must be highly clinical, detailed, and formatted using Markdown. Use tables where specified below.

---

SESSION DATA:
- Session Type: ${formData.note_type}
- Provider: ${formData.provider_name || "Not specified"}
- Patient: ${formData.patient_info || "Not specified"}
- Demographics: ${formData.demographics || "Not specified"}
- Chief Complaint: ${formData.chief_complaint || "Not specified"}
- Subjective / HPI: ${formData.subjective || "Not provided"}
- Objective / MSE notes: ${formData.objective || "Not provided"}
- Current Medications: ${formData.medications || "None listed"}
- Additional Notes / Labs: ${formData.additional || "None"}
- Session Duration: ${formData.session_duration || "45"} minutes
- CPT Code: ${formData.cpt_code || ""}

---

Generate each JSON field with detailed Markdown content following these exact standards:

**subjective:** Write a narrative paragraph. Include: chief complaint in patient's own words (use quotes), symptom onset/duration/frequency, sleep, appetite, energy, mood, concentration, functional impairment at work/relationships, psychosocial stressors, medication adherence details, substance use, collateral information if any, PHQ-9/GAD-7 scores if mentioned, and changes since last visit.

**objective:** Start with vital signs if provided. Then include a full MSE as a Markdown table with columns "Domain" and "Findings". Include all domains: Appearance, Behavior, Speech, Mood (patient-reported, in quotes), Affect (range/congruence), Thought Process, Thought Content (SI/HI/delusions/paranoia/obsessions), Perceptual, Cognition, Insight, Judgment. End with "Current Medications:" as a bulleted list with dose/route/frequency.

**assessment:** Write a clinical formulation paragraph first (treatment response, residual symptoms, contributing factors, differential reasoning). Then add a Markdown table of diagnoses with columns "ICD-10" and "Diagnosis". Include Z-codes for psychosocial stressors. End with a severity statement.

**risk_assessment:** Render as a Markdown table with columns "Domain" and "Finding". Rows: Suicidal Ideation, Plan, Intent, Means/Access, Homicidal Ideation, Self-Harm History, Protective Factors, Risk Level. End with one sentence on safety plan status.

**plan:** Use numbered sections with bold headers: 1. Medications, 2. Therapy, 3. Labs, 4. Patient Education, 5. Coordination of Care, 6. Follow-Up. Be specific — include dosing rationale, referral names, what was discussed, and follow-up timeline. End with PHQ/GAD monitoring plan.

**icd_codes:** Comma-separated ICD-10 codes only (e.g. "F33.1, F41.1, Z63.0")`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: "claude_sonnet_4_6",
        response_json_schema: {
          type: "object",
          properties: {
            subjective: { type: "string" },
            objective: { type: "string" },
            assessment: { type: "string" },
            risk_assessment: { type: "string" },
            plan: { type: "string" },
            icd_codes: { type: "string" }
          }
        }
      });

      // Write PHI clinical content to Supabase
      const supaRes = await base44.functions.invoke("supabase", {
        action: "insert",
        table: "patient_notes",
        data: {
          note_type: formData.note_type || "soap",
          subjective: result.subjective,
          objective: result.objective,
          assessment: result.assessment,
          risk_assessment: result.risk_assessment,
          plan: result.plan,
          provider_name: formData.provider_name,
          patient_info: formData.patient_info,
        }
      });
      const supabaseNoteId = supaRes?.data?.data?.[0]?.id || null;

      // Store only non-PHI metadata in Base44
      const note = await base44.entities.ClinicalNote.create({
        note_type: formData.note_type || "soap",
        icd_codes: result.icd_codes,
        status: "draft",
        provider_name: formData.provider_name,
        session_duration: formData.session_duration,
        cpt_code: formData.cpt_code,
        supabase_note_id: supabaseNoteId,
      });

      // Return enriched note object for immediate display
      setGenerating(false);
      return { ...note, subjective: result.subjective, objective: result.objective, assessment: result.assessment, risk_assessment: result.risk_assessment, plan: result.plan };
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
    setSelectedNote(prev => prev ? { ...prev, status: "finalized" } : prev);
    toast.success("Note finalized");
  };

  // Load full clinical content from Supabase when a note is selected
  const handleSelectNote = async (note) => {
    if (note.supabase_note_id) {
      const res = await base44.functions.invoke("supabase", {
        action: "select",
        table: "patient_notes",
        query: { id: note.supabase_note_id }
      });
      const clinical = res?.data?.data?.[0] || {};
      setSelectedNote({ ...note, ...clinical });
    } else {
      setSelectedNote(note);
    }
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