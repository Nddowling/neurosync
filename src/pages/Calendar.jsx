import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, addWeeks, subWeeks, isSameDay, isSameMonth, parseISO } from "date-fns";
import AppointmentDetailModal from "../components/calendar/AppointmentDetailModal";
import NewAppointmentModal from "../components/calendar/NewAppointmentModal";
import { useQueryClient } from "@tanstack/react-query";

const fetchAppointments = () =>
  base44.functions.invoke("supabase", { action: "select", table: "patient_appointments", query: {} })
    .then(r => r.data?.data || []);

const fetchPatients = () =>
  base44.functions.invoke("supabase", { action: "select", table: "patients", query: {} })
    .then(r => r.data?.data || []);

const TYPE_COLORS = {
  initial_evaluation: "bg-violet-100 text-violet-700 border-violet-200",
  follow_up: "bg-teal-100 text-teal-700 border-teal-200",
  medication_management: "bg-amber-100 text-amber-700 border-amber-200",
  crisis: "bg-red-100 text-red-700 border-red-200",
  therapy_session: "bg-blue-100 text-blue-700 border-blue-200",
};

const TYPE_DOT = {
  initial_evaluation: "bg-violet-400",
  follow_up: "bg-teal-400",
  medication_management: "bg-amber-400",
  crisis: "bg-red-400",
  therapy_session: "bg-blue-400",
};

export default function Calendar() {
  const [view, setView] = useState("month"); // month | week | day
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [newApptDate, setNewApptDate] = useState(null);
  const queryClient = useQueryClient();

  const { data: appointments = [] } = useQuery({
    queryKey: ["all-appointments"],
    queryFn: fetchAppointments,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["all-patients"],
    queryFn: fetchPatients,
  });

  const patientMap = Object.fromEntries(patients.map(p => [p.id, p]));

  const getApptDate = (appt) => parseISO(appt.appointment_date);

  const apptsByDate = {};
  appointments.forEach(appt => {
    const key = format(getApptDate(appt), "yyyy-MM-dd");
    if (!apptsByDate[key]) apptsByDate[key] = [];
    apptsByDate[key].push(appt);
  });

  const navigate = (dir) => {
    if (view === "month") setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(dir === 1 ? addDays(currentDate, 1) : addDays(currentDate, -1));
  };

  const goToday = () => setCurrentDate(new Date());

  const headerLabel = () => {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const s = startOfWeek(currentDate);
      const e = endOfWeek(currentDate);
      return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMMM d, yyyy");
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Calendar</h1>
          <p className="text-sm text-gray-400 mt-1">All patient appointments in one view</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            {["month", "week", "day"].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button onClick={() => { setNewApptDate(null); setShowNewAppt(true); }} className="bg-gray-900 hover:bg-gray-800 rounded-xl gap-1.5" size="sm">
            <Plus className="w-4 h-4" /> New Appointment
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Current period label */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-700">{headerLabel()}</h2>
      </div>

      {/* Calendar views */}
      {view === "month" && (
        <MonthView
          currentDate={currentDate}
          apptsByDate={apptsByDate}
          patientMap={patientMap}
          onSelectAppt={setSelectedAppt}
          onDayClick={(d) => { setCurrentDate(d); setView("day"); }}
          onNewAppt={(d) => { setNewApptDate(d); setShowNewAppt(true); }}
        />
      )}
      {view === "week" && (
        <WeekView
          currentDate={currentDate}
          apptsByDate={apptsByDate}
          patientMap={patientMap}
          onSelectAppt={setSelectedAppt}
        />
      )}
      {view === "day" && (
        <DayView
          currentDate={currentDate}
          apptsByDate={apptsByDate}
          patientMap={patientMap}
          onSelectAppt={setSelectedAppt}
        />
      )}

      {selectedAppt && (
        <AppointmentDetailModal
          appointment={selectedAppt}
          patient={patientMap[selectedAppt.patient_id]}
          onClose={() => setSelectedAppt(null)}
        />
      )}

      {showNewAppt && (
        <NewAppointmentModal
          open={showNewAppt}
          onClose={() => setShowNewAppt(false)}
          patients={patients}
          initialDate={newApptDate}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["all-appointments"] });
            queryClient.invalidateQueries({ queryKey: ["upcoming-appointments"] });
            setShowNewAppt(false);
          }}
        />
      )}
    </div>
  );
}

function MonthView({ currentDate, apptsByDate, patientMap, onSelectAppt, onDayClick }) {
  const start = startOfWeek(startOfMonth(currentDate));
  const end = endOfWeek(endOfMonth(currentDate));
  const days = [];
  let d = start;
  while (d <= end) { days.push(d); d = addDays(d, 1); }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 divide-x divide-gray-50">
          {week.map((day, di) => {
            const key = format(day, "yyyy-MM-dd");
            const dayAppts = apptsByDate[key] || [];
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);
            return (
              <div
                key={di}
                className={`min-h-[100px] p-2 border-b border-gray-50 cursor-pointer hover:bg-gray-50/80 transition-colors ${!isCurrentMonth ? "bg-gray-50/30" : ""}`}
                onClick={() => onDayClick(day)}
              >
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${isToday ? "bg-gray-900 text-white" : isCurrentMonth ? "text-gray-800" : "text-gray-300"}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayAppts.slice(0, 3).map(appt => {
                    const patient = patientMap[appt.patient_id];
                    return (
                      <div
                        key={appt.id}
                        onClick={e => { e.stopPropagation(); onSelectAppt(appt); }}
                        className={`text-[11px] px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 ${TYPE_COLORS[appt.type] || "bg-gray-100 text-gray-600 border-gray-200"}`}
                      >
                        {appt.appointment_time ? appt.appointment_time.slice(0, 5) + " " : ""}
                        {patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}
                      </div>
                    );
                  })}
                  {dayAppts.length > 3 && (
                    <div className="text-[11px] text-gray-400 px-1">+{dayAppts.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function WeekView({ currentDate, apptsByDate, patientMap, onSelectAppt }) {
  const start = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="grid grid-cols-7 divide-x divide-gray-100">
        {days.map((day, i) => {
          const key = format(day, "yyyy-MM-dd");
          const dayAppts = apptsByDate[key] || [];
          const isToday = isSameDay(day, new Date());
          return (
            <div key={i} className="min-h-[400px]">
              <div className={`py-3 text-center border-b border-gray-100 ${isToday ? "bg-gray-900" : "bg-gray-50"}`}>
                <div className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-teal-400" : "text-gray-400"}`}>{format(day, "EEE")}</div>
                <div className={`text-lg font-bold mt-0.5 ${isToday ? "text-white" : "text-gray-800"}`}>{format(day, "d")}</div>
              </div>
              <div className="p-2 space-y-1.5">
                {dayAppts.length === 0 && (
                  <p className="text-xs text-gray-300 text-center mt-4">No appointments</p>
                )}
                {dayAppts.map(appt => {
                  const patient = patientMap[appt.patient_id];
                  return (
                    <div
                      key={appt.id}
                      onClick={() => onSelectAppt(appt)}
                      className={`p-2 rounded-lg border text-xs cursor-pointer hover:opacity-80 transition-opacity ${TYPE_COLORS[appt.type] || "bg-gray-100 text-gray-600 border-gray-200"}`}
                    >
                      {appt.appointment_time && <div className="font-semibold">{appt.appointment_time.slice(0, 5)}</div>}
                      <div className="truncate mt-0.5">{patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}</div>
                      <div className="capitalize opacity-70 mt-0.5">{appt.type?.replace(/_/g, " ")}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ currentDate, apptsByDate, patientMap, onSelectAppt }) {
  const key = format(currentDate, "yyyy-MM-dd");
  const dayAppts = (apptsByDate[key] || []).sort((a, b) =>
    (a.appointment_time || "").localeCompare(b.appointment_time || "")
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {dayAppts.length === 0 ? (
        <div className="text-center py-20">
          <CalendarIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No appointments scheduled for this day.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {dayAppts.map(appt => {
            const patient = patientMap[appt.patient_id];
            return (
              <div
                key={appt.id}
                onClick={() => onSelectAppt(appt)}
                className="flex items-start gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="w-14 text-sm font-semibold text-gray-500 pt-0.5 shrink-0">
                  {appt.appointment_time ? appt.appointment_time.slice(0, 5) : "—"}
                </div>
                <div className={`w-1 self-stretch rounded-full ${TYPE_DOT[appt.type] || "bg-gray-300"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">
                    {patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5 capitalize">{appt.type?.replace(/_/g, " ")}</div>
                  {appt.notes && <div className="text-xs text-gray-400 mt-1 truncate">{appt.notes}</div>}
                </div>
                <div className="text-xs text-gray-400 shrink-0">{appt.duration_minutes || 50} min</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}