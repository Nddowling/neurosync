import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageSquare, FileText, Pill, BookOpen, ArrowRight } from "lucide-react";

const actions = [
  {
    title: "New Consult",
    description: "Start a clinical consultation",
    icon: MessageSquare,
    page: "Consult",
    color: "bg-teal-500",
    gradient: "from-teal-50 to-white"
  },
  {
    title: "SOAP Note",
    description: "Generate a clinical note",
    icon: FileText,
    page: "SOAPNotes",
    color: "bg-violet-500",
    gradient: "from-violet-50 to-white"
  },
  {
    title: "Med Reference",
    description: "Check medications & interactions",
    icon: Pill,
    page: "Medications",
    color: "bg-amber-500",
    gradient: "from-amber-50 to-white"
  },
  {
    title: "DSM-5 Lookup",
    description: "Diagnostic criteria search",
    icon: BookOpen,
    page: "DSMReference",
    color: "bg-slate-600",
    gradient: "from-slate-50 to-white"
  }
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {actions.map((action) => (
        <Link
          key={action.page}
          to={createPageUrl(action.page)}
          className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${action.gradient} border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300 hover:-translate-y-0.5`}
        >
          <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center mb-3 shadow-lg`}>
            <action.icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{action.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{action.description}</p>
          <ArrowRight className="w-4 h-4 text-gray-300 absolute bottom-5 right-5 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
        </Link>
      ))}
    </div>
  );
}