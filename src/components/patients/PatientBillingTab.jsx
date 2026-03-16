import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CreditCard, Plus, Trash2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const EMPTY_BILL = { service_date: "", cpt_code: "", icd_codes: "", description: "", fee: "", insurance_billed: "", insurance_paid: "", patient_responsibility: "", status: "pending", notes: "" };

const COMMON_CPTS = [
  { code: "99213", label: "Office visit, low complexity (99213)" },
  { code: "99214", label: "Office visit, mod complexity (99214)" },
  { code: "99215", label: "Office visit, high complexity (99215)" },
  { code: "90837", label: "Psychotherapy 60 min (90837)" },
  { code: "90834", label: "Psychotherapy 45 min (90834)" },
  { code: "90832", label: "Psychotherapy 30 min (90832)" },
  { code: "90833", label: "Psych add-on to E&M 30 min (90833)" },
  { code: "90836", label: "Psych add-on to E&M 45 min (90836)" },
  { code: "90838", label: "Psych add-on to E&M 60 min (90838)" },
  { code: "90839", label: "Crisis psychotherapy (90839)" },
];

export default function PatientBillingTab({ patientId }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_BILL);
  const queryClient = useQueryClient();

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["patient_billing", patientId],
    queryFn: async () => {
      const res = await base44.functions.invoke("supabase", {
        action: "select", table: "patient_billing", query: { patient_id: patientId },
      });
      return res.data?.data || [];
    },
  });

  const addBill = async () => {
    await base44.functions.invoke("supabase", {
      action: "insert", table: "patient_billing",
      data: { ...form, patient_id: patientId },
    });
    queryClient.invalidateQueries({ queryKey: ["patient_billing", patientId] });
    setShowForm(false);
    setForm(EMPTY_BILL);
    toast.success("Billing entry added");
  };

  const removeBill = async (id) => {
    await base44.functions.invoke("supabase", {
      action: "delete", table: "patient_billing", query: { id },
    });
    queryClient.invalidateQueries({ queryKey: ["patient_billing", patientId] });
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (isLoading) return <Skeleton className="h-24 rounded-xl" />;

  const totalBilled = bills.reduce((sum, b) => sum + (parseFloat(b.fee) || 0), 0);
  const totalPaid = bills.reduce((sum, b) => sum + (parseFloat(b.insurance_paid) || 0) + (parseFloat(b.patient_responsibility) || 0), 0);
  const totalBalance = totalBilled - totalPaid;

  const statusColors = { pending: "bg-amber-100 text-amber-700", submitted: "bg-blue-100 text-blue-700", paid: "bg-green-100 text-green-700", denied: "bg-red-100 text-red-700", partial: "bg-orange-100 text-orange-700" };

  return (
    <div>
      {/* Summary */}
      {bills.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Total Billed", value: `$${totalBilled.toFixed(2)}`, color: "text-gray-900" },
            { label: "Total Collected", value: `$${totalPaid.toFixed(2)}`, color: "text-green-600" },
            { label: "Outstanding", value: `$${totalBalance.toFixed(2)}`, color: totalBalance > 0 ? "text-red-600" : "text-green-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{bills.length} billing entries</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 h-8 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add Entry
        </Button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" placeholder="Service date" value={form.service_date} onChange={e => set("service_date", e.target.value)} className="bg-white" />
            <Select value={form.cpt_code} onValueChange={v => set("cpt_code", v)}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="CPT Code" /></SelectTrigger>
              <SelectContent>
                {COMMON_CPTS.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                <SelectItem value="custom">Custom code</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.cpt_code === "custom" && (
            <Input placeholder="Enter custom CPT code" value={form.description} onChange={e => set("description", e.target.value)} className="bg-white" />
          )}
          <Input placeholder="ICD-10 codes (e.g. F32.1, F41.1)" value={form.icd_codes} onChange={e => set("icd_codes", e.target.value)} className="bg-white" />
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="Fee charged ($)" value={form.fee} onChange={e => set("fee", e.target.value)} className="bg-white" />
            <Input placeholder="Insurance paid ($)" value={form.insurance_paid} onChange={e => set("insurance_paid", e.target.value)} className="bg-white" />
            <Input placeholder="Patient paid ($)" value={form.patient_responsibility} onChange={e => set("patient_responsibility", e.target.value)} className="bg-white" />
          </div>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="submitted">Submitted to Insurance</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial Payment</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Notes" value={form.notes} onChange={e => set("notes", e.target.value)} className="bg-white" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={addBill} disabled={!form.service_date} className="bg-gray-900 hover:bg-gray-800">Save</Button>
          </div>
        </div>
      )}

      {bills.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <CreditCard className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No billing entries yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bills.map(bill => (
            <div key={bill.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{bill.cpt_code}</p>
                  {bill.icd_codes && <span className="text-xs text-gray-400">{bill.icd_codes}</span>}
                </div>
                <p className="text-xs text-gray-400">{bill.service_date ? new Date(bill.service_date).toLocaleDateString() : "—"}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {bill.fee && <p className="text-sm font-semibold text-gray-900">${parseFloat(bill.fee).toFixed(2)}</p>}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[bill.status] || "bg-gray-100 text-gray-600"}`}>
                  {bill.status}
                </span>
              </div>
              <button onClick={() => removeBill(bill.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}