import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, FileText, Activity, Clock } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import QuickActions from "../components/dashboard/QuickActions";
import RecentSessionCard from "../components/dashboard/RecentSessionCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => base44.entities.ConsultSession.list("-created_date", 10),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: () => base44.entities.ClinicalNote.list("-created_date", 50),
  });

  const activeSessions = sessions.filter(s => s.status === "active").length;
  const completedToday = sessions.filter(s => {
    const d = new Date(s.created_date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
          {getGreeting()}, {user?.full_name?.split(" ")[0] || "Doctor"}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Your clinical assistant is ready. What can I help you with today?
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <QuickActions />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard title="Active Sessions" value={activeSessions} icon={Activity} color="teal" href="/Consult" />
        <StatCard title="Today's Consults" value={completedToday} icon={Clock} color="violet" href="/Consult" />
        <StatCard title="Total Sessions" value={sessions.length} icon={MessageSquare} color="slate" href="/Consult" />
        <StatCard title="Notes Generated" value={notes.length} icon={FileText} color="amber" href="/SOAPNotes" />
      </div>

      {/* Recent Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Sessions</h2>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No sessions yet. Start your first consultation.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => (
              <RecentSessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}