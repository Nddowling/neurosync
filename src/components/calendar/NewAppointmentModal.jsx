import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, ChevronLeft, Check, Loader2, User } from "lucide-react";
import { format } from "date-fns";

const APPT_TYPES = [
  { value: "initial_evaluation", label: "Initial Evaluation" },
  { value: "follow_up", label: "Follow-Up" },
  { value: "medication_management", label: "Medication Management" },
  { value: "therapy_session", label: "Therapy Session" },
  { value: "crisis", label: "Crisis" },
];

const DURATIONS = [30, 45, 50, 60, 90];

// Step 1: Search or create patient
// Step 2: Schedule appointment
const STEPS = { SEARCH: "search", NEW_PATIENT: "new_patient", SCHEDULE: "schedule" };

export default function NewAppointmentModal({ open, onClose, patients, initialDate, onCreated }) {
  const [step, setStep] = useState(STEPS.SEARCH);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [saving, setSaving] = useState(false);

  // New patient form
  const [newPatient, setNewPatient] = useState({
    first_name: "", last_name: "", date_of_birth: "", sex: "",
    mrn: "", phone: "", email: "",
  });

  // Appointment form
  const [appt, setAppt] = useState({
    appointment_date: initialDate ? format(initialDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    appointment_time: "09:00",
    type: "follow_up",
    duration_minutes: 50,
    notes: "",
    location: "",
    status: "scheduled",
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return patients.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.mrn || "").toLowerCase().includes(q) ||
      (p.patient_code || "").toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search, patients]);

  const setNP = (k, v) => setNewPatient(f => ({ ...f, [k]: v }));
  const setA = (k, v) => setAppt(f => ({ ...f, [k]: v }));

  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    setSearch(`${p.first_name} ${p.last_name}`);
    setStep(STEPS.SCHEDULE);
  };

  const handleCreatePatient = async () => {
    if (!newPatient.first_name || !newPatient.last_name) return;
    setSaving(true);
    const user = await base44.auth.me();
    const code = `PT-${Date.now().toString().slice(-5)}`;
    const res = await base44.functions.invoke("supabase", {
      action: "insert",
      table: "patients",
      data: { ...newPatient, patient_code: code, clinician_email: user.email },
    });
    const created = res?.data?.data?.[0];
    setSaving(false);
    if (created) {
      setSelectedPatient(created);
      setStep(STEPS.SCHEDULE);
    }
  };

  const handleSchedule = async () => {
    if (!selectedPatient) return;
    setSaving(true);
    await base44.functions.invoke("supabase", {
      action: "insert",
      table: "patient_appointments",
      data: {
        ...appt,
        patient_id: selectedPatient.id,
        duration_minutes: Number(appt.duration_minutes),
      },
    });
    setSaving(false);
    onCreated();
    handleClose();
  };

  const handleClose = () => {
    setStep(STEPS.SEARCH);
    setSearch("");
    setSelectedPatient(null);
    setNewPatient({ first_name: "", last_name: "", date_of_birth: "", sex: "", mrn: "", phone: "", email: "" });
    setAppt({ appointment_date: format(new Date(), "yyyy-MM-dd"), appointment_time: "09:00", type: "follow_up", duration_minutes: 50, notes: "", location: "", status: "scheduled" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {(step === STEPS.NEW_PATIENT || step === STEPS.SCHEDULE) && (
              <button
                onClick={() => setStep(step === STEPS.SCHEDULE ? STEPS.SEARCH : STEPS.SEARCH)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <DialogTitle>
              {step === STEPS.SEARCH && "New Appointment"}
              {step === STEPS.NEW_PATIENT && "New Patient"}
              {step === STEPS.SCHEDULE && "Schedule Appointment"}
            </DialogTitle>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-2">
            {[
              { key: STEPS.SEARCH, label: "Patient" },
              { key: STEPS.SCHEDULE, label: "Appointment" },
            ].map((s, i) => (
              <React.Fragment key={s.key}>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${step === s.key || (step === STEPS.NEW_PATIENT && s.key === STEPS.SEARCH) ? "text-gray-900" : step === STEPS.SCHEDULE && s.key === STEPS.SEARCH ? "text-teal-600" : "text-gray-400"}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === s.key || (step === STEPS.NEW_PATIENT && s.key === STEPS.SEARCH) ? "bg-gray-900 text-white" : step === STEPS.SCHEDULE && s.key === STEPS.SEARCH ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                    {step === STEPS.SCHEDULE && s.key === STEPS.SEARCH ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  {s.label}
                </div>
                {i === 0 && <div className="flex-1 h-px bg-gray-200" />}
              </React.Fragment>
            ))}
          </div>
        </DialogHeader>

        {/* STEP 1: Search */}
        {(step === STEPS.SEARCH) && (
          <div className="space-y-4 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                autoFocus
                placeholder="Search by name, MRN, or patient code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>

            {search.trim() && filtered.length === 0 && (
              <div className="text-center py-6 text-sm text-gray-400">
                No patients found for "{search}"
              </div>
            )}

            {filtered.length > 0 && (
              <div className="space-y-1.5">
                {filtered.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {p.first_name?.[0]}{p.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{p.first_name} {p.last_name}</div>
                      <div className="text-xs text-gray-400">
                        {p.mrn ? `MRN: ${p.mrn}` : p.patient_code || ""}
                        {p.date_of_birth ? ` · DOB: ${p.date_of_birth}` : ""}
                      </div>
                    </div>
                    <Check className="w-4 h-4 text-teal-400 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => setStep(STEPS.NEW_PATIENT)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <div className="font-semibold text-gray-700 text-sm">Add New Patient</div>
                  <div className="text-xs text-gray-400">Create a new patient record and schedule</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 1b: New Patient Form */}
        {step === STEPS.NEW_PATIENT && (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">First Name *</Label>
                <Input required value={newPatient.first_name} onChange={e => setNP("first_name", e.target.value)} placeholder="Jane" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Last Name *</Label>
                <Input required value={newPatient.last_name} onChange={e => setNP("last_name", e.target.value)} placeholder="Doe" className="rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Date of Birth</Label>
                <Input type="date" value={newPatient.date_of_birth} onChange={e => setNP("date_of_birth", e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Sex</Label>
                <Select value={newPatient.sex} onValueChange={v => setNP("sex", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non_binary">Non-binary</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Phone</Label>
                <Input value={newPatient.phone} onChange={e => setNP("phone", e.target.value)} placeholder="(555) 000-0000" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">MRN (optional)</Label>
                <Input value={newPatient.mrn} onChange={e => setNP("mrn", e.target.value)} placeholder="Optional" className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Email</Label>
              <Input type="email" value={newPatient.email} onChange={e => setNP("email", e.target.value)} placeholder="patient@email.com" className="rounded-xl" />
            </div>
            <p className="text-xs text-gray-400">Additional details (insurance, emergency contact, address) can be added in the patient record after scheduling.</p>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setStep(STEPS.SEARCH)} className="rounded-xl">Back</Button>
              <Button
                onClick={handleCreatePatient}
                disabled={saving || !newPatient.first_name || !newPatient.last_name}
                className="bg-gray-900 hover:bg-gray-800 rounded-xl gap-2"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : "Create & Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Schedule */}
        {step === STEPS.SCHEDULE && selectedPatient && (
          <div className="space-y-4 mt-2">
            {/* Selected patient chip */}
            <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl border border-teal-100">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {selectedPatient.first_name?.[0]}{selectedPatient.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900">{selectedPatient.first_name} {selectedPatient.last_name}</div>
                {selectedPatient.mrn && <div className="text-xs text-gray-500">MRN: {selectedPatient.mrn}</div>}
              </div>
              <button onClick={() => { setStep(STEPS.SEARCH); setSelectedPatient(null); setSearch(""); }} className="text-xs text-teal-600 hover:text-teal-800 font-medium">Change</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Date *</Label>
                <Input type="date" value={appt.appointment_date} onChange={e => setA("appointment_date", e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Time *</Label>
                <Input type="time" value={appt.appointment_time} onChange={e => setA("appointment_time", e.target.value)} className="rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Appointment Type</Label>
                <Select value={appt.type} onValueChange={v => setA("type", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Duration</Label>
                <Select value={String(appt.duration_minutes)} onValueChange={v => setA("duration_minutes", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Location (optional)</Label>
              <Input value={appt.location} onChange={e => setA("location", e.target.value)} placeholder="e.g. Office, Telehealth" className="rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Notes (optional)</Label>
              <Input value={appt.notes} onChange={e => setA("notes", e.target.value)} placeholder="Any prep notes or reminders..." className="rounded-xl" />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setStep(STEPS.SEARCH)} className="rounded-xl">Back</Button>
              <Button
                onClick={handleSchedule}
                disabled={saving || !appt.appointment_date || !appt.appointment_time}
                className="bg-gray-900 hover:bg-gray-800 rounded-xl gap-2"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Scheduling...</> : "Schedule Appointment"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}