import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, User, Phone, Mail, MapPin, Shield, Edit2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import PatientConsultsTab from "@/components/patients/PatientConsultsTab";
import PatientNotesTab from "@/components/patients/PatientNotesTab";
import PatientMedsTab from "@/components/patients/PatientMedsTab";
import PatientGoalsTab from "@/components/patients/PatientGoalsTab";
import PatientAppointmentsTab from "@/components/patients/PatientAppointmentsTab";
import PatientBillingTab from "@/components/patients/PatientBillingTab";
import PatientFormModal from "@/components/patients/PatientFormModal";

export default function PatientDetail() {
  const params = new URLSearchParams(window.location.search);
  const patientId = params.get("id");
  const [tab, setTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const res = await base44.functions.invoke("supabase", {
        action: "select",
        table: "patients",
        query: { id: patientId },
      });
      return res.data?.data?.[0] || null;
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-10 text-center text-gray-400">
        Patient not found. <Link to="/Patients" className="text-teal-600 underline">Go back</Link>
      </div>
    );
  }

  const age = patient.date_of_birth
    ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Back */}
      <Link to="/Patients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Patients
      </Link>

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl">
              {(patient.first_name?.[0] || "") + (patient.last_name?.[0] || "")}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {patient.first_name} {patient.last_name}
              </h1>
              <div className="flex flex-wrap gap-3 mt-1">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{patient.patient_code}</span>
                {patient.mrn && <span className="text-xs text-gray-400">MRN: {patient.mrn}</span>}
                {age && <span className="text-xs text-gray-400">{age} years old</span>}
                {patient.sex && <span className="text-xs text-gray-400 capitalize">{patient.sex.replace("_", " ")}</span>}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5 rounded-xl">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </Button>
        </div>

        {/* Contact row */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-50">
          {patient.phone && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500"><Phone className="w-3.5 h-3.5" />{patient.phone}</span>
          )}
          {patient.email && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500"><Mail className="w-3.5 h-3.5" />{patient.email}</span>
          )}
          {patient.address && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500"><MapPin className="w-3.5 h-3.5" />{patient.address}</span>
          )}
          {patient.insurance_info && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500"><Shield className="w-3.5 h-3.5" />{patient.insurance_info}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-100 rounded-xl p-1 mb-6 flex-wrap h-auto gap-1">
          {["overview","consults","notes","medications","goals","appointments","billing"].map(t => (
            <TabsTrigger key={t} value={t} className="rounded-lg capitalize text-xs px-3 py-1.5">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Emergency Contact</p>
              <p className="text-sm text-gray-700">{patient.emergency_contact || "—"}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Insurance</p>
              <p className="text-sm text-gray-700">{patient.insurance_info || "—"}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 md:col-span-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Patient Since</p>
              <p className="text-sm text-gray-700">{new Date(patient.created_at).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="consults"><PatientConsultsTab patientId={patientId} patient={patient} /></TabsContent>
        <TabsContent value="notes"><PatientNotesTab patientId={patientId} patient={patient} /></TabsContent>
        <TabsContent value="medications"><PatientMedsTab patientId={patientId} /></TabsContent>
        <TabsContent value="goals"><PatientGoalsTab patientId={patientId} /></TabsContent>
        <TabsContent value="appointments"><PatientAppointmentsTab patientId={patientId} /></TabsContent>
        <TabsContent value="billing"><PatientBillingTab patientId={patientId} /></TabsContent>
      </Tabs>

      {/* Edit Modal — reuse form with prefilled data */}
      {editOpen && (
        <PatientEditModal
          patient={patient}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}

// Inline edit modal using the same supabase update action
function PatientEditModal({ patient, onClose, onSaved }) {
  const [form, setForm] = useState({ ...patient });
  const [saving, setSaving] = useState(false);
  const { Dialog, DialogContent, DialogHeader, DialogTitle } = require("@/components/ui/dialog");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.functions.invoke("supabase", {
      action: "update",
      table: "patients",
      query: { id: patient.id },
      data: {
        first_name: form.first_name, last_name: form.last_name,
        date_of_birth: form.date_of_birth, sex: form.sex,
        mrn: form.mrn, phone: form.phone, email: form.email,
        address: form.address, emergency_contact: form.emergency_contact,
        insurance_info: form.insurance_info,
      },
    });
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Patient</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-gray-700 block mb-1">First Name</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.first_name || ""} onChange={e => set("first_name", e.target.value)} /></div>
            <div><label className="text-sm font-medium text-gray-700 block mb-1">Last Name</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.last_name || ""} onChange={e => set("last_name", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.phone || ""} onChange={e => set("phone", e.target.value)} /></div>
            <div><label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.email || ""} onChange={e => set("email", e.target.value)} /></div>
          </div>
          <div><label className="text-sm font-medium text-gray-700 block mb-1">Address</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.address || ""} onChange={e => set("address", e.target.value)} /></div>
          <div><label className="text-sm font-medium text-gray-700 block mb-1">Emergency Contact</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.emergency_contact || ""} onChange={e => set("emergency_contact", e.target.value)} /></div>
          <div><label className="text-sm font-medium text-gray-700 block mb-1">Insurance Info</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.insurance_info || ""} onChange={e => set("insurance_info", e.target.value)} /></div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-gray-900 hover:bg-gray-800">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}