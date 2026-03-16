import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { User, Clock, MapPin, FileText, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TYPE_COLORS = {
  initial_evaluation: "bg-violet-100 text-violet-700",
  follow_up: "bg-teal-100 text-teal-700",
  medication_management: "bg-amber-100 text-amber-700",
  crisis: "bg-red-100 text-red-700",
  therapy_session: "bg-blue-100 text-blue-700",
};

const STATUS_COLORS = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-gray-100 text-gray-600",
};

export default function AppointmentDetailModal({ appointment, patient, onClose }) {
  if (!appointment) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Type & Status badges */}
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${TYPE_COLORS[appointment.type] || "bg-gray-100 text-gray-600"}`}>
              {appointment.type?.replace(/_/g, " ") || "Appointment"}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[appointment.status] || "bg-gray-100 text-gray-600"}`}>
              {appointment.status || "scheduled"}
            </span>
          </div>

          {/* Patient */}
          {patient && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold">
                {patient.first_name?.[0]}{patient.last_name?.[0]}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{patient.first_name} {patient.last_name}</div>
                {patient.mrn && <div className="text-xs text-gray-400">MRN: {patient.mrn}</div>}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="space-y-2.5">
            <Detail icon={Calendar} label="Date" value={appointment.appointment_date ? format(parseISO(appointment.appointment_date), "MMMM d, yyyy") : "—"} />
            <Detail icon={Clock} label="Time" value={appointment.appointment_time ? appointment.appointment_time.slice(0, 5) : "Not set"} />
            <Detail icon={Clock} label="Duration" value={`${appointment.duration_minutes || 50} minutes`} />
            {appointment.location && <Detail icon={MapPin} label="Location" value={appointment.location} />}
            {appointment.notes && <Detail icon={FileText} label="Notes" value={appointment.notes} />}
          </div>

          {/* Actions */}
          {patient && (
            <Link to={`/PatientDetail?id=${patient.id}`}>
              <Button variant="outline" className="w-full mt-2" size="sm">
                <User className="w-4 h-4 mr-2" />
                View Patient Record
              </Button>
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-sm text-gray-800">{value}</div>
      </div>
    </div>
  );
}