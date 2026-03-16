import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Pill, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const EMPTY_MED = { name: "", dose: "", frequency: "", prescribing_provider: "", start_date: "", status: "active", notes: "" };

export default function PatientMedsTab({ patientId }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_MED);
  const queryClient = useQueryClient();

  const { data: meds = [], isLoading } = useQuery({
    queryKey: ["patient_meds", patientId],
    queryFn: async () => {
      const res = await base44.functions.invoke("supabase", {
        action: "select", table: "patient_medications", query: { patient_id: patientId },
      });
      return res.data?.data || [];
    },
  });

  const addMed = async () => {
    await base44.functions.invoke("supabase", {
      action: "insert", table: "patient_medications",
      data: { ...form, patient_id: patientId },
    });
    queryClient.invalidateQueries({ queryKey: ["patient_meds", patientId] });
    setShowForm(false);
    setForm(EMPTY_MED);
    toast.success("Medication added");
  };

  const removeMed = async (id) => {
    await base44.functions.invoke("supabase", {
      action: "delete", table: "patient_medications", query: { id },
    });
    queryClient.invalidateQueries({ queryKey: ["patient_meds", patientId] });
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (isLoading) return <Skeleton className="h-24 rounded-xl" />;

  const active = meds.filter(m => m.status === "active");
  const inactive = meds.filter(m => m.status !== "active");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{active.length} active medication{active.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 h-8 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add Medication
        </Button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Medication name *" value={form.name} onChange={e => set("name", e.target.value)} className="bg-white" />
            <Input placeholder="Dose (e.g. 20mg)" value={form.dose} onChange={e => set("dose", e.target.value)} className="bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Frequency (e.g. once daily)" value={form.frequency} onChange={e => set("frequency", e.target.value)} className="bg-white" />
            <Input placeholder="Prescribing provider" value={form.prescribing_provider} onChange={e => set("prescribing_provider", e.target.value)} className="bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" placeholder="Start date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className="bg-white" />
            <Input placeholder="Notes" value={form.notes} onChange={e => set("notes", e.target.value)} className="bg-white" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={addMed} disabled={!form.name} className="bg-gray-900 hover:bg-gray-800">Save</Button>
          </div>
        </div>
      )}

      {meds.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Pill className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No medications recorded.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.length > 0 && <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active</p>}
          {active.map(med => <MedRow key={med.id} med={med} onRemove={removeMed} />)}
          {inactive.length > 0 && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4">Discontinued</p>}
          {inactive.map(med => <MedRow key={med.id} med={med} onRemove={removeMed} faded />)}
        </div>
      )}
    </div>
  );
}

function MedRow({ med, onRemove, faded }) {
  return (
    <div className={`flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 ${faded ? "opacity-60" : ""}`}>
      <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
        <Pill className="w-4 h-4 text-teal-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{med.name} {med.dose && `· ${med.dose}`}</p>
        <p className="text-xs text-gray-400">{med.frequency}{med.prescribing_provider ? ` · ${med.prescribing_provider}` : ""}</p>
      </div>
      {med.notes && <p className="text-xs text-gray-400 hidden sm:block max-w-xs truncate">{med.notes}</p>}
      <button onClick={() => onRemove(med.id)} className="text-gray-300 hover:text-red-500 transition-colors ml-auto flex-shrink-0">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}