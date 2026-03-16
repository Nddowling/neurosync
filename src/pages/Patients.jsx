import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, User, Phone, Calendar, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import PatientFormModal from "@/components/patients/PatientFormModal";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function Patients() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const user = await base44.auth.me();
      const res = await base44.functions.invoke("supabase", {
        action: "select",
        table: "patients",
        query: { clinician_email: user.email },
      });
      return res.data?.data || [];
    },
  });

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.patient_code?.toLowerCase().includes(q) ||
      p.mrn?.toLowerCase().includes(q)
    );
  });

  const handleCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["patients"] });
    setShowForm(false);
    toast.success("Patient created successfully");
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-400 mt-0.5">{patients.length} total patients</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-gray-900 hover:bg-gray-800 rounded-xl gap-2">
          <Plus className="w-4 h-4" />
          New Patient
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, code, or MRN..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {/* Patient List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <User className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {search ? "No patients match your search." : "No patients yet. Add your first patient."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(patient => (
            <Link
              key={patient.id}
              to={`/PatientDetail?id=${patient.id}`}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {(patient.first_name?.[0] || "") + (patient.last_name?.[0] || "") || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">
                  {patient.first_name} {patient.last_name}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-400">{patient.patient_code || "No code"}</span>
                  {patient.mrn && <span className="text-xs text-gray-400">MRN: {patient.mrn}</span>}
                  {patient.date_of_birth && (
                    <span className="text-xs text-gray-400">
                      DOB: {new Date(patient.date_of_birth).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              {patient.phone && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
                  <Phone className="w-3 h-3" />
                  {patient.phone}
                </div>
              )}
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </Link>
          ))}
        </div>
      )}

      <PatientFormModal open={showForm} onClose={() => setShowForm(false)} onCreated={handleCreated} />
    </div>
  );
}