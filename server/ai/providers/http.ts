import { ApiError } from '../../api/errors.js';
export interface Inference { system:string; input:string; structured:boolean }
export interface Provider { generate(request:Inference):Promise<string> }
export type ProviderName='openai'|'anthropic'|'google';
export class HttpProvider implements Provider {
 constructor(readonly provider:ProviderName,readonly model:string,private key:string,private transport:typeof fetch=fetch){}
 async generate(request:Inference):Promise<string> {
  const headers:Record<string,string>={'Content-Type':'application/json'};let url:string;let body:unknown;
  const jsonInstruction=request.structured?'\nReturn only one valid JSON object. No prose or code fences.':'';
  if(this.provider==='openai') {
   url='https://api.openai.com/v1/chat/completions';headers.Authorization=`Bearer ${this.key}`;
   body={model:this.model,store:false,max_completion_tokens:8192,...(/^gpt-5-mini(?:-|$)/.test(this.model)?{reasoning_effort:'low'}:{}),messages:[{role:'system',content:request.system+jsonInstruction},{role:'user',content:request.input}],...(request.structured?{response_format:{type:'json_object'}}:{})};
  }else if(this.provider==='anthropic') {
   url='https://api.anthropic.com/v1/messages';headers['x-api-key']=this.key;headers['anthropic-version']='2023-06-01';
   body={model:this.model,max_tokens:8192,system:request.system+jsonInstruction,messages:[{role:'user',content:request.input}]};
  }else {
   url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;headers['x-goog-api-key']=this.key;
   body={systemInstruction:{parts:[{text:request.system+jsonInstruction}]},contents:[{role:'user',parts:[{text:request.input}]}],generationConfig:{maxOutputTokens:8192,...(request.structured?{responseMimeType:'application/json'}:{})}};
  }
  let response:Response;try {response=await this.transport(url,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});} catch {throw new ApiError(503,'service_unavailable');}
  if(!response.ok)throw new ApiError(503,'service_unavailable');
  const data=await response.json() as Record<string,unknown>;
  let text:unknown;
  if(this.provider==='openai')text=(data.choices as {message?:{content?:unknown}}[]|undefined)?.[0]?.message?.content;
  else if(this.provider==='anthropic')text=(data.content as {type:string;text?:string}[]|undefined)?.filter(p=>p.type==='text').map(p=>p.text).join('\n');
  else text=(data.candidates as {content?:{parts?:{text?:string}[]}}[]|undefined)?.[0]?.content?.parts?.map(p=>p.text??'').join('\n');
  if(typeof text!=='string'||!text.trim()||text.length>200000)throw new ApiError(503,'service_unavailable');return text;
 }
}
