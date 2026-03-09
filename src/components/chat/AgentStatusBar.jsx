import React from "react";
import { CheckCircle2, Brain, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

const STATES = {
  received: {
    icon: CheckCircle2,
    label: "Message received",
    color: "text-teal-600",
    bg: "bg-teal-50 border-teal-200",
    pulse: false,
  },
  thinking: {
    icon: Brain,
    label: "Thinking…",
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-200",
    pulse: true,
  },
  typing: {
    icon: Pencil,
    label: "Typing response…",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    pulse: true,
  },
};

export default function AgentStatusBar({ status }) {
  if (!status) return null;
  const cfg = STATES[status];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <div className="flex justify-start px-4 pb-1">
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all", cfg.bg, cfg.color)}>
        <Icon className={cn("h-3.5 w-3.5", cfg.pulse && "animate-pulse")} />
        <span>{cfg.label}</span>
        {cfg.pulse && (
          <span className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className={cn("w-1 h-1 rounded-full opacity-70", cfg.color.replace("text-", "bg-"))}
                style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }}
              />
            ))}
          </span>
        )}
      </div>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}