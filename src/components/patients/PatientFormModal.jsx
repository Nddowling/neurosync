import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function PatientFormModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", date_of_birth: "", sex: "",
    mrn: "", patient_code: "", phone: "", email: "",
    address: "",
    ec_name: "", ec_relationship: "", ec_phone: "",
    insurance_carrier: "", insurance_plan: "", insurance_member_id: "", insurance_group: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const user = await base44.auth.me();
    // Auto-generate patient code if not provided
    const code = form.patient_code || `PT-${Date.now().toString().slice(-5)}`;
    await base44.functions.invoke("supabase", {
      action: "insert",
      table: "patients",
      data: { ...form, patient_code: code, clinician_email: user.email },
    });
    setSaving(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Patient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input required value={form.first_name} onChange={e => set("first_name", e.target.value)} placeholder="Jane" />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input required value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Doe" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Sex</Label>
              <Select value={form.sex} onValueChange={v => set("sex", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non_binary">Non-binary</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>MRN</Label>
              <Input value={form.mrn} onChange={e => set("mrn", e.target.value)} placeholder="Optional" />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(555) 000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="patient@email.com" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Main St, City, State ZIP" />
          </div>

          <div className="space-y-1.5">
            <Label>Emergency Contact</Label>
            <Input value={form.emergency_contact} onChange={e => set("emergency_contact", e.target.value)} placeholder="Name — Relationship — Phone" />
          </div>

          <div className="space-y-1.5">
            <Label>Insurance Info</Label>
            <Input value={form.insurance_info} onChange={e => set("insurance_info", e.target.value)} placeholder="Carrier, Plan, Member ID, Group #" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-gray-900 hover:bg-gray-800">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Create Patient"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}