import { z } from 'zod';
const text = z.string().trim().max(200);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
});
// Foundation slice uses the existing SQL's canonical names. UI mappings come in phase 5.
export const patientFields = z.object({
  mrn: text.nullable().optional(), first_name: text.nullable().optional(), last_name: text.nullable().optional(),
  dob: date.nullable().optional(), sex: text.nullable().optional(),
  email: z.string().email().max(320).nullable().optional(), phone: text.nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
}).strict();
export const patientCreate = patientFields.refine(value => !!(value.first_name || value.last_name || value.mrn));
export const patientUpdate = patientFields.refine(value => Object.keys(value).length > 0);
export const recordId = z.string().uuid();
export type PatientInput = z.infer<typeof patientFields>;
export interface Patient extends Required<PatientInput> { id: string; created_at: Date; updated_at: Date }
