export interface Profile {id:string;email:string;full_name:string;credentials:string;role:string;tos_accepted_at:string|null}
export interface ClinicalRecord {
 address?:string;insurance_info?:string;emergency_contact?:string;created_at?:string;fee?:number;insurance_paid?:number;patient_responsibility?:number;service_date?:string;
 first_name?:string;last_name?:string;patient_code?:string;mrn?:string;date_of_birth?:string;phone?:string;email?:string;sex?:string;notes?:string;appointment_date?:string;appointment_time?:string;type?:string;duration_minutes?:number;location?:string;conversation_id?:string;
 id:string;created_date:string;updated_date:string;status?:string;note_type?:string;subjective?:string;objective?:string;assessment?:string;risk_assessment?:string;plan?:string;icd_codes?:string;cpt_code?:string;provider_name?:string;patient_info?:string;session_duration?:string;patient_id?:string;session_id?:string;title?:string;content?:string;category?:string;tags?:string;source?:string;file_url?:string;session_date?:string;chief_complaint?:string;session_type?:string;
}
export interface Message {id:string;role:'user'|'assistant';content:string;status:string}
export interface Conversation {id:string;created_date:string;metadata:{name:string;session_id:string};messages:Message[]}
export interface Subscription {plan:'free'|'professional'|'enterprise'|'promo_justin';status:string;consults_used:number;soap_notes_used:number}
export class RequestError extends Error {constructor(readonly status:number,readonly code:string){super(code === 'ocr_required' ? 'This PDF contains no searchable text. Run OCR before uploading it.' : code === 'limit_reached' ? 'Monthly plan limit reached.' : code === 'service_unavailable' ? 'This service is unavailable. Please try again later.' : 'The request could not be completed.');}}
export async function request<T>(path:string,method='GET',data?:unknown):Promise<T> {
 const csrf=document.cookie.split('; ').find(item=>item.startsWith('neurosync_csrf='))?.split('=')[1];
 const response=await fetch(path,{method,credentials:'same-origin',headers:{...(data===undefined?{}:{'Content-Type':'application/json'}),...(csrf?{'X-CSRF-Token':csrf}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});
 if(!response.ok){const body=await response.json().catch(()=>({}));throw new RequestError(response.status,typeof body.error==='string'?body.error:'request_failed');}
 return response.status===204 ? undefined as T : response.json() as Promise<T>;
}
const records=async (input:unknown)=>(await request<{data:ClinicalRecord[]}>('/api/records','POST',input)).data;
const entity=(table:string)=>({
 list:(sort='-created_date',limit=100,offset=0)=>{if(sort!=='-created_date')throw new Error('Unsupported sort');return records({table,action:'select',limit,offset});},
 create:async(data:unknown)=>(await records({table,action:'insert',data}))[0],
 update:async(id:string,data:unknown)=>(await records({table,action:'update',query:{id},data}))[0],
 delete:async(id:string)=>{await records({table,action:'delete',query:{id}});},
});
const listeners=new Map<string,Set<(conversation:Conversation)=>void>>();
export const neurosync={
 auth:{
  me:()=>request<Profile>('/api/auth/me'),
  updateMe:(data:Partial<Pick<Profile,'full_name'|'credentials'|'tos_accepted_at'>>)=>request<Profile>('/api/auth/me','PATCH',data),
  isAuthenticated:async()=>{try{await request('/api/auth/me');return true;}catch(error){if(error instanceof RequestError && error.status===401)return false;throw error;}},
  logout:async()=>{await request('/api/auth/logout','POST',{});localStorage.removeItem('neurosync_active_conv');window.location.assign('/');},
  redirectToLogin:(returnTo?:string)=>{void returnTo;window.location.assign('/Login');},
 },
 knowledge:{list:()=>request<ClinicalRecord[]>('/api/knowledge'),upload:async(file:File)=>{
  if(file.size>2097152)throw new Error('PDF files must be 2 MB or smaller.');
  const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  return request<ClinicalRecord>('/api/knowledge/upload','POST',{name:file.name,data:btoa(binary)});
 }},
 entities:{ClinicalNote:entity('patient_notes'),ConsultSession:entity('patient_sessions'),KnowledgeBase:entity('knowledge_base')},
 functions:{invoke:async(name:string,input:unknown):Promise<{data: {data:ClinicalRecord[]} & Partial<Subscription> & {url?:string}}>=>{
  if(name==='records')return {data:{data:await records(input)}};
  if(name==='getSubscription')return {data:{...await request<Subscription>('/api/subscription'),data:[]}};
  if(name==='createCheckout')return {data:{...await request<{url:string}>('/api/billing/checkout','POST',input),data:[]}};
  throw new Error('Unknown application operation');
 }},
 ai:{
  soap:(input:unknown)=>request<ClinicalRecord>('/api/ai/soap','POST',input),
  diagnostic: (query:string)=>request<{content:string;sources:{sourceId:string;title:string;fileUrl:string|null}[]}>('/api/ai/reference','POST',{task:'diagnostic',query}),
  reference:async(task:'medication'|'diagnostic'|'cpt',query:string)=>(await request<{content:string}>('/api/ai/reference','POST',{task,query})).content,
 },
 agents:{
  listConversations:(options?:unknown)=>{void options;return request<Conversation[]>('/api/conversations');},
  getConversation:(id:string)=>request<Conversation>(`/api/conversations/${encodeURIComponent(id)}`),
  createConversation:(input:{metadata?:{name?:string};agent_name?:string;patient_id?:string})=>request<Conversation>('/api/conversations','POST',{name:input.metadata?.name??'Clinical consultation',...(input.patient_id?{patient_id:input.patient_id}:{})}),
  addMessage:async(conversation:Conversation,input:{role:'user';content:string})=>{
   const result=await request<Conversation>(`/api/conversations/${encodeURIComponent(conversation.id)}/messages`,'POST',{content:input.content,request_id:crypto.randomUUID()});
   listeners.get(conversation.id)?.forEach(listener=>listener(result));return result;
  },
  subscribeToConversation:(id:string,listener:(conversation:Conversation)=>void)=>{const set=listeners.get(id)??new Set();set.add(listener);listeners.set(id,set);return()=>{set.delete(listener);if(!set.size)listeners.delete(id);};},
 },
};
