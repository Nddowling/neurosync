import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ title, value, subtitle, icon: Icon, color = "teal" }) {
  const colors = {
    teal: "from-teal-500 to-teal-600 shadow-teal-500/20",
    slate: "from-slate-600 to-slate-700 shadow-slate-600/20",
    violet: "from-violet-500 to-violet-600 shadow-violet-500/20",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/20",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", colors[color])}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}