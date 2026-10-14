import {z} from 'zod';
import {ApiError} from '../api/errors.js';
import type {MedicationLabel,MedicationSearch,MedicationSummary} from '../../shared/medication-library.js';
const strings=z.array(z.string()).default([]);
const label=z.object({id:z.string().uuid(),set_id:z.string().uuid(),effective_time:z.string().regex(/^\d{8}$/),openfda:z.object({brand_name:strings,generic_name:strings,manufacturer_name:strings,route:strings,product_type:strings}).default({})}).passthrough();
const envelope=z.object({meta:z.object({last_updated:z.string().default('Unknown'),results:z.object({total:z.number().int().nonnegative()})}),results:z.array(label)});
type Label=z.infer<typeof label>;
function summary(row:Label):MedicationSummary{return {id:row.id,setId:row.set_id,brandNames:row.openfda.brand_name,genericNames:row.openfda.generic_name,manufacturers:row.openfda.manufacturer_name,routes:row.openfda.route,productTypes:row.openfda.product_type,labelDate:`${row.effective_time.slice(0,4)}-${row.effective_time.slice(4,6)}-${row.effective_time.slice(6,8)}`,sourceUrl:`https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${row.set_id}`};}
const firstSections=['boxed_warning','indications_and_usage','dosage_and_administration','dosage_forms_and_strengths','contraindications','warnings_and_cautions','drug_interactions','adverse_reactions','pregnancy','lactation','pediatric_use','geriatric_use'];
export class MedicationLibrary {
 private cache=new Map<string,{expires:number;data:MedicationSearch|MedicationLabel}>();
 constructor(private transport:typeof fetch=fetch,private now:()=>number=Date.now){}
 private async cached<T extends MedicationSearch|MedicationLabel>(key:string,load:()=>Promise<T>):Promise<T>{
  const cached=this.cache.get(key);if(cached&&cached.expires>this.now())return cached.data as T;
  const data=await load();if(this.cache.size>=40)this.cache.delete(this.cache.keys().next().value!);
  this.cache.set(key,{expires:this.now()+3600000,data});return data;
 }
 private async fetch(search:string,offset:number,limit:number){
  const url=new URL('https://api.fda.gov/drug/label.json');url.searchParams.set('search',search);url.searchParams.set('skip',String(offset));url.searchParams.set('limit',String(limit));url.searchParams.set('sort','effective_time:desc');
  try{
   const response=await this.transport(url,{signal:AbortSignal.timeout(10000)});
   if(response.status===404)return null;
   if(!response.ok)throw new Error('Source unavailable');
   const reader=response.body?.getReader();if(!reader)throw new Error('Missing source body');
   let size=0;const chunks:Uint8Array[]=[];
   try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>8000000){await reader.cancel();throw new Error('Source response too large');}chunks.push(part.value);}}finally{reader.releaseLock();}
   return envelope.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  }catch{throw new ApiError(503,'service_unavailable');}
 }
 async search(input:unknown):Promise<MedicationSearch>{
  const {query,offset}=z.object({query:z.string().trim().min(2).max(80).regex(/^[\p{L}\p{N} '\-]+$/u),offset:z.coerce.number().int().min(0).max(1000).default(0)}).strict().parse(input);
  const name=query.toLowerCase();return this.cached(`search:${name}:${offset}`,async()=>{
   const data=await this.fetch(`openfda.generic_name:"${name}" OR openfda.brand_name:"${name}"`,offset,10);
   return {results:data?.results.map(summary)??[],total:data?.meta.results.total??0,offset,limit:10,datasetUpdated:data?.meta.last_updated??'Unknown',retrievedAt:new Date(this.now()).toISOString()};
  });
 }
 async get(id:string):Promise<MedicationLabel>{
  z.string().uuid().parse(id);return this.cached(`label:${id}`,async()=>{
   const data=await this.fetch(`id:"${id}"`,0,1);const row=data?.results[0];if(!data||!row)throw new ApiError(404,'not_found');
   const fields=Object.keys(row).filter(key=>key!=='spl_product_data_elements'&&!key.endsWith('_table')&&Array.isArray(row[key])&&(row[key] as unknown[]).every(value=>typeof value==='string'));
   fields.sort((a,b)=>{const ai=firstSections.indexOf(a),bi=firstSections.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b);});
   return {...summary(row),sections:fields.map(key=>({key,title:key.replaceAll('_',' '),text:(row[key] as string[]).join('\n\n')})),datasetUpdated:data.meta.last_updated,retrievedAt:new Date(this.now()).toISOString()};
  });
 }
}
