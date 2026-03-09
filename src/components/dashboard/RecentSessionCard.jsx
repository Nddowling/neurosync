import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const typeLabels = {
  initial_evaluation: "Initial Eval",
  follow_up: "Follow-up",
  crisis: "Crisis",
  medication_management: "Med Mgmt",
  therapy_session: "Therapy",
};

const statusColors = {
  active: "bg-teal-50 text-teal-700 border-teal-200",
  completed: "bg-gray-50 text-gray-600 border-gray-200",
  archived: "bg-slate-50 text-slate-500 border-slate-200",
};

export default function RecentSessionCard({ session }) {
  return (
    <Link
      to={createPageUrl("Consult") + `?sessionId=${session.id}`}
      className="group flex items-center gap-4 px-5 py-4 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md hover:shadow-gray-100/50 transition-all duration-200"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{session.title}</h3>
          <Badge variant="outline" className={`text-[10px] px-2 py-0 ${statusColors[session.status] || statusColors.active}`}>
            {session.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {session.session_type && (
            <span className="font-medium">{typeLabels[session.session_type] || session.session_type}</span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(session.created_date), "MMM d, h:mm a")}
          </span>
        </div>
        {session.chief_complaint && (
          <p className="text-xs text-gray-500 mt-1.5 truncate">{session.chief_complaint}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
    </Link>
  );
}