import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Target, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const EMPTY_GOAL = { title: "", description: "", target_date: "", status: "active", domain: "" };

export default function PatientGoalsTab({ patientId }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_GOAL);
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["patient_goals", patientId],
    queryFn: async () => {
      const res = await base44.functions.invoke("supabase", {
        action: "select", table: "patient_goals", query: { patient_id: patientId },
      });
      return res.data?.data || [];
    },
  });

  const addGoal = async () => {
    await base44.functions.invoke("supabase", {
      action: "insert", table: "patient_goals",
      data: { ...form, patient_id: patientId },
    });
    queryClient.invalidateQueries({ queryKey: ["patient_goals", patientId] });
    setShowForm(false);
    setForm(EMPTY_GOAL);
    toast.success("Goal added");
  };

  const toggleGoal = async (goal) => {
    const newStatus = goal.status === "achieved" ? "active" : "achieved";
    await base44.functions.invoke("supabase", {
      action: "update", table: "patient_goals",
      query: { id: goal.id }, data: { status: newStatus },
    });
    queryClient.invalidateQueries({ queryKey: ["patient_goals", patientId] });
  };

  const removeGoal = async (id) => {
    await base44.functions.invoke("supabase", {
      action: "delete", table: "patient_goals", query: { id },
    });
    queryClient.invalidateQueries({ queryKey: ["patient_goals", patientId] });
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (isLoading) return <Skeleton className="h-24 rounded-xl" />;

  const active = goals.filter(g => g.status !== "achieved");
  const achieved = goals.filter(g => g.status === "achieved");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{active.length} active goal{active.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 h-8 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add Goal
        </Button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Goal title *" value={form.title} onChange={e => set("title", e.target.value)} className="bg-white" />
            <Input placeholder="Domain (e.g. mood, social, work)" value={form.domain} onChange={e => set("domain", e.target.value)} className="bg-white" />
          </div>
          <Input placeholder="Description" value={form.description} onChange={e => set("description", e.target.value)} className="bg-white" />
          <Input type="date" placeholder="Target date" value={form.target_date} onChange={e => set("target_date", e.target.value)} className="bg-white" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={addGoal} disabled={!form.title} className="bg-gray-900 hover:bg-gray-800">Save</Button>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Target className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No treatment goals set yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map(goal => <GoalRow key={goal.id} goal={goal} onToggle={toggleGoal} onRemove={removeGoal} />)}
          {achieved.length > 0 && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4">Achieved</p>}
          {achieved.map(goal => <GoalRow key={goal.id} goal={goal} onToggle={toggleGoal} onRemove={removeGoal} faded />)}
        </div>
      )}
    </div>
  );
}

function GoalRow({ goal, onToggle, onRemove, faded }) {
  return (
    <div className={`flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100 ${faded ? "opacity-60" : ""}`}>
      <button onClick={() => onToggle(goal)} className="mt-0.5 flex-shrink-0">
        {goal.status === "achieved"
          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
          : <Circle className="w-5 h-5 text-gray-300 hover:text-teal-500 transition-colors" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${faded ? "line-through text-gray-400" : "text-gray-900"}`}>{goal.title}</p>
        {goal.domain && <span className="text-xs bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-md">{goal.domain}</span>}
        {goal.description && <p className="text-xs text-gray-400 mt-0.5">{goal.description}</p>}
        {goal.target_date && <p className="text-xs text-gray-400 mt-0.5">Target: {new Date(goal.target_date).toLocaleDateString()}</p>}
      </div>
      <button onClick={() => onRemove(goal.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}