import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HttpProvider} from '../server/ai/providers/http.js';
import {billingContext} from '../server/ai/schemas.js';
import {LexicalEmbedding,cosine} from '../server/ai/embeddings.js';
test('billing context preserves crisis and combined documentation branches',()=>{
 assert.equal(billingContext(['90839']),'crisis');assert.equal(billingContext(['90840','99213','90833']),'crisis');
 assert.equal(billingContext(['99213','90833']),'combined');assert.equal(billingContext(['99214']),'evaluation');assert.equal(billingContext(['90837']),'psychotherapy');assert.equal(billingContext([]),'general');
});
for(const provider of ['openai','anthropic','google'] as const)test(`${provider} adapter owns credentials, model routing and structured output request`,async()=>{
 const transport:typeof fetch=async(url,init)=>{
  assert.ok(String(url).startsWith('https://'));assert.equal(init?.method,'POST');assert.ok(init?.signal);
  const body=JSON.parse(String(init?.body));assert.ok(JSON.stringify(body).includes('synthetic-model')||String(url).includes('synthetic-model'));
  const headers=new Headers(init?.headers);assert.equal(headers.get(provider==='openai'?'authorization':provider==='anthropic'?'x-api-key':'x-goog-api-key'),provider==='openai'?'Bearer synthetic-key':'synthetic-key');
  return Response.json(provider==='openai'?{choices:[{message:{content:'{"ok":true}'}}]}:provider==='anthropic'?{content:[{type:'text',text:'{"ok":true}'}]}:{candidates:[{content:{parts:[{text:'{"ok":true}'}]}}]});
 };
 assert.equal(await new HttpProvider(provider,'synthetic-model','synthetic-key',transport).generate({system:'Owned prompt',input:'Synthetic facts',structured:true}),'{"ok":true}');
});
test('provider failures do not expose upstream payloads',async()=>{
 const provider=new HttpProvider('openai','synthetic-model','synthetic-key',async()=>new Response('SENSITIVE_UPSTREAM_BODY',{status:500}));
 await assert.rejects(provider.generate({system:'prompt',input:'synthetic',structured:false}),{status:503,code:'service_unavailable'});
});
test('local lexical embeddings are deterministic and have unit norm',async()=>{
 const provider=new LexicalEmbedding();const vector=await provider.embed('sleep monitoring protocol');assert.deepEqual(vector,await provider.embed('sleep monitoring protocol'));
 assert.ok(Math.abs(cosine(vector,vector)-1)<0.00001);assert.equal(cosine(vector,[]),0);
});

test('GPT-5 mini uses low reasoning with a bounded completion and no stored provider response',async()=>{
 const transport:typeof fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));
  assert.equal(body.model,'gpt-5-mini');assert.equal(body.reasoning_effort,'low');
  assert.equal(body.max_completion_tokens,8192);assert.equal(body.store,false);
  assert.deepEqual(body.response_format,{type:'json_object'});
  assert.equal(body.temperature,undefined);
  return Response.json({choices:[{message:{content:'{"ok":true}'}}]});
 };
 assert.equal(await new HttpProvider('openai','gpt-5-mini','synthetic-key',transport).generate({system:'Owned prompt',input:'Synthetic facts',structured:true}),'{"ok":true}');
});

test('reference requests use a smaller GPT-5 mini reasoning budget without changing clinical requests',async()=>{
 const transport:typeof fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));assert.equal(body.reasoning_effort,'minimal');assert.equal(body.max_completion_tokens,4096);
  return Response.json({choices:[{message:{content:'Brief reference'}}]});
 };
 assert.equal(await new HttpProvider('openai','gpt-5-mini','synthetic-key',transport).generate({system:'prompt',input:'question',structured:false,fast:true}),'Brief reference');
});

test('shared medication library preserves provenance, isolates lookup syntax and refreshes cached labels',async()=>{
 const {MedicationLibrary}=await import('../server/domain/medication-library.js');
 let now=Date.parse('2026-09-11T12:00:00Z');let calls=0;
 const id='00000000-0000-4000-8000-000000000001';
 const transport:typeof fetch=async(input)=>{
  calls++;const url=new URL(String(input));assert.equal(url.origin,'https://api.fda.gov');assert.equal(url.pathname,'/drug/label.json');
  assert.ok(url.searchParams.get('search')?.includes('sertraline')||url.searchParams.get('search')===`id:"${id}"`);
  return Response.json({meta:{last_updated:'2026-09-11',results:{total:1}},results:[{id,set_id:id,effective_time:'20260901',openfda:{generic_name:['SERTRALINE'],manufacturer_name:['Synthetic labeler']},boxed_warning:['Supplied warning'],drug_interactions:['Supplied interaction text'],drug_interactions_table:['<table>Source table</table>']}]});
 };
 const library=new MedicationLibrary(transport,()=>now);
 const first=await library.search({query:'Sertraline'});assert.equal(first.results[0]?.sourceUrl,`https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${id}`);assert.equal(first.results[0]?.labelDate,'2026-09-01');
 await library.search({query:'sertraline'});assert.equal(calls,1);
 const detail=await library.get(id);assert.equal(detail.sections[0]?.key,'boxed_warning');assert.equal(detail.sections.find(s=>s.key==='drug_interactions')?.text,'Supplied interaction text');assert.ok(!detail.sections.some(s=>s.key.endsWith('_table')));
 await library.get(id);assert.equal(calls,2);now+=3600001;await library.get(id);assert.equal(calls,3);
 await assert.rejects(library.search({query:'x" OR _exists_:openfda'}));await assert.rejects(library.get('https://attacker.invalid'));assert.equal(calls,3);
});

test('medication source distinguishes empty matches from unavailable or malformed upstream data',async()=>{
 const {MedicationLibrary}=await import('../server/domain/medication-library.js');
 assert.deepEqual((await new MedicationLibrary(async()=>new Response(null,{status:404})).search({query:'unknown drug'})).results,[]);
 for(const response of [()=>new Response('private upstream error',{status:429}),()=>Response.json({results:'bad schema'})]){
  await assert.rejects(new MedicationLibrary(async()=>response()).search({query:'sertraline'}),{status:503,code:'service_unavailable'});
 }
});

test('diagnostic retrieval expands clinical abbreviations and excludes edition and lookup instructions',async()=>{
 const {diagnosticRetrievalQuery}=await import('../server/ai/diagnostic-query.js');
 const query=diagnosticRetrievalQuery('Using my private DSM-5 (2013) reference, briefly summarize ADHD onset considerations. Name the edition.');
 assert.ok(query.includes('attention deficit hyperactivity'));assert.ok(query.includes('onset'));assert.ok(!query.includes('edition'));assert.ok(!query.includes('reference'));
 assert.ok(diagnosticRetrievalQuery('PTSD').includes('posttraumatic stress'));
});
