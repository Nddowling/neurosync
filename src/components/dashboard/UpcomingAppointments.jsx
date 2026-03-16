import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, isAfter, startOfToday } from "date-fns";
import { Calendar, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const TYPE_DOT = {
  initial_evaluation: "bg-violet-400",
  follow_up: "bg-teal-400",
  medication_management: "bg-amber-400",
  crisis: "bg-red-400",
  therapy_session: "bg-blue-400",
};

export default function UpcomingAppointments() {
  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ["upcoming-appointments"],
    queryFn: () => base44.functions.invoke("supabase", { action: "select", table: "patient_appointments", query: {} }).then(r => r.data?.data || []),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["all-patients-mini"],
    queryFn: () => base44.functions.invoke("supabase", { action: "select", table: "patients", query: {} }).then(r => r.data?.data || []),
  });

  const patientMap = Object.fromEntries(patients.map(p => [p.id, p]));
  const today = startOfToday();

  const upcoming = appointments
    .filter(a => a.appointment_date && (isAfter(parseISO(a.appointment_date), today) || format(parseISO(a.appointment_date), "yyyy-MM-dd") === format(today, "yyyy-MM-dd")))
    .sort((a, b) => {
      const dateCmp = a.appointment_date.localeCompare(b.appointment_date);
      if (dateCmp !== 0) return dateCmp;
      return (a.appointment_time || "").localeCompare(b.appointment_time || "");
    })
    .slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
        <Link to="/Calendar" className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
          View calendar <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loadingAppts ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : upcoming.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
          <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No upcoming appointments.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.map(appt => {
            const patient = patientMap[appt.patient_id];
            const isToday = format(parseISO(appt.appointment_date), "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
            return (
              <Link key={appt.id} to="/Calendar" className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                <div className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[appt.type] || "bg-gray-300"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}
                  </div>
                  <div className="text-xs text-gray-400 capitalize">{appt.type?.replace(/_/g, " ")}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs font-semibold ${isToday ? "text-teal-600" : "text-gray-500"}`}>
                    {isToday ? "Today" : format(parseISO(appt.appointment_date), "MMM d")}
                  </div>
                  {appt.appointment_time && (
                    <div className="text-xs text-gray-400">{appt.appointment_time.slice(0, 5)}</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}