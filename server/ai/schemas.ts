import { z } from 'zod';
export const soapSchema=z.object({subjective:z.string().min(1),objective:z.string().min(1),assessment:z.string().min(1),risk_assessment:z.string().min(1),plan:z.string().min(1),icd_codes:z.string(),cpt_codes:z.string()}).strict();
export const soapRequest=z.object({
 transcript:z.string().min(1).max(120000).optional(),
 codes:z.array(z.object({code:z.string().regex(/^\d{5}$/),label:z.string().max(300).optional()}).strict()).max(12).default([]),
 form:z.object({note_type:z.enum(['soap','progress','intake','discharge','medication_change']).optional(),provider_name:z.string().max(300).optional(),patient_info:z.string().max(300).optional(),demographics:z.string().max(1000).optional(),chief_complaint:z.string().max(10000).optional(),subjective:z.string().max(30000).optional(),objective:z.string().max(20000).optional(),medications:z.string().max(10000).optional(),additional:z.string().max(10000).optional(),session_duration:z.string().max(20).optional(),cpt_code:z.string().max(100).optional(),icd_codes:z.string().max(1000).optional()}).strict().optional(),
 patient_id:z.string().uuid().optional(),session_id:z.string().uuid().optional(),request_id:z.string().uuid(),
}).strict().refine(value=>!!(value.transcript||value.form?.chief_complaint));
export type SOAPGenerationRequest=z.infer<typeof soapRequest>;
export type SOAPGenerationResult=z.infer<typeof soapSchema>;
export type BillingContext='crisis'|'combined'|'evaluation'|'psychotherapy'|'general';
export function billingContext(codes:string[]):BillingContext {
 if(codes.includes('90839')||codes.includes('90840'))return 'crisis';
 const em=codes.some(code=>/^9921[1-5]$/.test(code));
 if(em&&codes.some(code=>['90833','90836','90838'].includes(code)))return 'combined';
 if(em)return 'evaluation';
 if(codes.some(code=>['90832','90834','90837','90847'].includes(code)))return 'psychotherapy';
 return 'general';
}
