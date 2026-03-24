import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, X } from "lucide-react";
import { motion } from "framer-motion";
import IcdCodeInput from "./IcdCodeInput";
import CptCodeSelect from "./CptCodeSelect";

export default function SOAPNoteForm({ onSubmit, onCancel, isGenerating }) {
  const [formData, setFormData] = useState({
    note_type: "soap",
    chief_complaint: "",
    subjective: "",
    objective: "",
    medications: "",
    demographics: "",
    additional: "",
    provider_name: "",
    patient_info: "",
    session_duration: "45",
    cpt_code: "90837",
    icd_codes: ""
  });

  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Generate SOAP Note</h3>
          <p className="text-xs text-gray-400 mt-0.5">Provide session details and AI will generate a comprehensive note</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500 mb-1.5 block">Note Type</Label>
            <Select value={formData.note_type} onValueChange={(v) => update("note_type", v)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="soap">SOAP Note</SelectItem>
                <SelectItem value="progress">Progress Note</SelectItem>
                <SelectItem value="intake">Intake Note</SelectItem>
                <SelectItem value="medication_change">Medication Change</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1.5 block">Patient Demographics</Label>
            <Input
              placeholder="e.g., 36M, MDD, GAD — Hispanic, married"
              value={formData.demographics}
              onChange={(e) => update("demographics", e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Row 2 — Provider + Patient Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500 mb-1.5 block">Provider Name & Credentials</Label>
            <Input
              placeholder="e.g., Dr. Sarah Mitchell, MD — Psychiatry"
              value={formData.provider_name}
              onChange={(e) => update("provider_name", e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1.5 block">Patient ID / Initials / MRN</Label>
            <Input
              placeholder="e.g., J.D. | DOB: 04/12/1989 | MRN: 00847231"
              value={formData.patient_info}
              onChange={(e) => update("patient_info", e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Row 3 — Duration + CPT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500 mb-1.5 block">Session Duration (min)</Label>
            <Input
              placeholder="e.g., 45"
              value={formData.session_duration}
              onChange={(e) => update("session_duration", e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1.5 block">CPT Code</Label>
            <CptCodeSelect value={formData.cpt_code} onChange={(v) => update("cpt_code", v)} />
          </div>
        </div>

        {/* ICD-10 Codes */}
        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">ICD-10 Diagnosis Codes</Label>
          <IcdCodeInput value={formData.icd_codes} onChange={(v) => update("icd_codes", v)} />
          <p className="text-[11px] text-gray-400 mt-1">AI will also auto-generate ICD codes — this pre-populates the assessment.</p>
        </div>

        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">Chief Complaint</Label>
          <Input
            placeholder="e.g., Worsening depression and anxiety, poor medication adherence"
            value={formData.chief_complaint}
            onChange={(e) => update("chief_complaint", e.target.value)}
            className="rounded-xl"
          />
        </div>

        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">Subjective / History of Present Illness</Label>
          <Textarea
            placeholder="Patient reports... Include symptom onset, duration, frequency, psychosocial stressors, PHQ/GAD scores, medication adherence..."
            value={formData.subjective}
            onChange={(e) => update("subjective", e.target.value)}
            className="rounded-xl min-h-[100px]"
          />
        </div>

        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">Objective Findings / MSE & Vitals</Label>
          <Textarea
            placeholder="Vital signs, MSE: appearance, behavior, speech, mood, affect, thought process/content, cognition, insight, judgment..."
            value={formData.objective}
            onChange={(e) => update("objective", e.target.value)}
            className="rounded-xl min-h-[80px]"
          />
        </div>

        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">Current Medications</Label>
          <Textarea
            placeholder="List current psychiatric and relevant medical medications with doses and frequency..."
            value={formData.medications}
            onChange={(e) => update("medications", e.target.value)}
            className="rounded-xl min-h-[60px]"
          />
        </div>

        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">Additional Notes / Labs / Collateral</Label>
          <Textarea
            placeholder="Lab results, collateral info, previous PHQ-9 scores, referrals pending..."
            value={formData.additional}
            onChange={(e) => update("additional", e.target.value)}
            className="rounded-xl min-h-[60px]"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} className="rounded-xl">Cancel</Button>
          <Button
            onClick={() => onSubmit(formData)}
            disabled={isGenerating || !formData.chief_complaint}
            className="bg-gray-900 hover:bg-gray-800 rounded-xl gap-2"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate Note</>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}