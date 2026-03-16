import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, Plus, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const EMPTY_APT = { appointment_date: "", appointment_time: "", type: "follow_up", duration_minutes: "50", location: "", notes: "", status: "scheduled" };

export default function PatientAppointmentsTab({ patientId }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_APT);
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["patient_appointments", patientId],
    queryFn: async () => {
      const res = await base44.functions.invoke("supabase", {
        action: "select", table: "patient_appointments", query: { patient_id: patientId },
      });
      return res.data?.data || [];
    },
  });

  const addAppointment = async () => {
    await base44.functions.invoke("supabase", {
      action: "insert", table: "patient_appointments",
      data: { ...form, patient_id: patientId, duration_minutes: Number(form.duration_minutes) || 50 },
    });
    queryClient.invalidateQueries({ queryKey: ["patient_appointments", patientId] });
    setShowForm(false);
    setForm(EMPTY_APT);
    toast.success("Appointment scheduled");
  };

  const removeAppointment = async (id) => {
    await base44.functions.invoke("supabase", {
      action: "delete", table: "patient_appointments", query: { id },
    });
    queryClient.invalidateQueries({ queryKey: ["patient_appointments", patientId] });
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (isLoading) return <Skeleton className="h-24 rounded-xl" />;

  const upcoming = appointments.filter(a => new Date(a.appointment_date) >= new Date() || a.status === "scheduled");
  const past = appointments.filter(a => new Date(a.appointment_date) < new Date() && a.status !== "scheduled");

  const statusColors = { scheduled: "bg-blue-100 text-blue-700", completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700", no_show: "bg-orange-100 text-orange-700" };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{upcoming.length} upcoming</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 h-8 text-xs">
          <Plus className="w-3.5 h-3.5" /> Schedule
        </Button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Input type="date" value={form.appointment_date} onChange={e => set("appointment_date", e.target.value)} className="bg-white" />
            <Input type="time" value={form.appointment_time} onChange={e => set("appointment_time", e.target.value)} className="bg-white" />
            <Input placeholder="Duration (min)" value={form.duration_minutes} onChange={e => set("duration_minutes", e.target.value)} className="bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.type} onValueChange={v => set("type", v)}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="initial_evaluation">Initial Evaluation</SelectItem>
                <SelectItem value="follow_up">Follow-Up</SelectItem>
                <SelectItem value="medication_management">Medication Management</SelectItem>
                <SelectItem value="therapy_session">Therapy Session</SelectItem>
                <SelectItem value="crisis">Crisis</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Location / Telehealth" value={form.location} onChange={e => set("location", e.target.value)} className="bg-white" />
          </div>
          <Input placeholder="Notes" value={form.notes} onChange={e => set("notes", e.target.value)} className="bg-white" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={addAppointment} disabled={!form.appointment_date} className="bg-gray-900 hover:bg-gray-800">Save</Button>
          </div>
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No appointments scheduled.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.length > 0 && <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Upcoming</p>}
          {upcoming.map(a => <AptRow key={a.id} apt={a} onRemove={removeAppointment} statusColors={statusColors} />)}
          {past.length > 0 && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4">Past</p>}
          {past.map(a => <AptRow key={a.id} apt={a} onRemove={removeAppointment} statusColors={statusColors} faded />)}
        </div>
      )}
    </div>
  );
}

function AptRow({ apt, onRemove, statusColors, faded }) {
  return (
    <div className={`flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 ${faded ? "opacity-60" : ""}`}>
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-blue-700">{new Date(apt.appointment_date).toLocaleDateString("en-US", { month: "short" })}</span>
        <span className="text-sm font-bold text-blue-900 leading-tight">{new Date(apt.appointment_date).getDate()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 capitalize">{apt.type?.replace(/_/g, " ")}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {apt.appointment_time && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{apt.appointment_time}</span>}
          {apt.duration_minutes && <span className="text-xs text-gray-400">{apt.duration_minutes} min</span>}
          {apt.location && <span className="text-xs text-gray-400">{apt.location}</span>}
        </div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColors[apt.status] || "bg-gray-100 text-gray-600"}`}>
        {apt.status}
      </span>
      <button onClick={() => onRemove(apt.id)} className="text-gray-300 hover:text-red-500 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}